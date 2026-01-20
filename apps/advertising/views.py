# apps/advertising/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta

from .models import Client, Advertisement
from .serializers import (
    ClientSerializer, 
    AdvertisementSerializer,
    AdvertisementListSerializer,
    ActiveAdvertisementSerializer
)


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        queryset = Client.objects.all()
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        plan_filter = self.request.query_params.get('plan', None)
        if plan_filter:
            queryset = queryset.filter(plan=plan_filter)
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(company_name__icontains=search) |
                Q(contact_name__icontains=search) |
                Q(email__icontains=search)
            )
        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def active(self, request):
        today = timezone.now().date()
        active_clients = Client.objects.filter(
            status='active',
            start_date__lte=today,
            end_date__gte=today
        )
        serializer = self.get_serializer(active_clients, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def expiring_soon(self, request):
        today = timezone.now().date()
        expiring_date = today + timedelta(days=30)
        expiring_clients = Client.objects.filter(
            status='active',
            end_date__gte=today,
            end_date__lte=expiring_date
        ).order_by('end_date')
        serializer = self.get_serializer(expiring_clients, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        total = Client.objects.count()
        active = Client.objects.filter(status='active').count()
        by_plan = {
            'gold': Client.objects.filter(plan='gold', status='active').count(),
            'silver': Client.objects.filter(plan='silver', status='active').count(),
            'bronze': Client.objects.filter(plan='bronze', status='active').count(),
        }
        return Response({
            'total_clients': total,
            'active_clients': active,
            'clients_by_plan': by_plan,
        })


class AdvertisementViewSet(viewsets.ModelViewSet):
    queryset = Advertisement.objects.all()
    permission_classes = [IsAuthenticated, IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action == 'list':
            return AdvertisementListSerializer
        return AdvertisementSerializer

    def get_queryset(self):
        queryset = Advertisement.objects.select_related('client')
        client_id = self.request.query_params.get('client', None)
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        placement = self.request.query_params.get('placement', None)
        if placement:
            queryset = queryset.filter(placement=placement)
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(campaign_name__icontains=search) |
                Q(client__company_name__icontains=search)
            )
        return queryset.order_by('-priority', '-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def increment_impression(self, request, pk=None):
        ad = self.get_object()
        ad.increment_impressions()
        return Response({'impressions': ad.impressions})

    @action(detail=True, methods=['post'])
    def increment_click(self, request, pk=None):
        ad = self.get_object()
        ad.increment_clicks()
        return Response({'clicks': ad.clicks})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        total = Advertisement.objects.count()
        active = Advertisement.objects.filter(status='active').count()
        total_impressions = sum(ad.impressions for ad in Advertisement.objects.all())
        total_clicks = sum(ad.clicks for ad in Advertisement.objects.all())
        return Response({
            'total_ads': total,
            'active_ads': active,
            'total_impressions': total_impressions,
            'total_clicks': total_clicks,
            'overall_ctr': (total_clicks / total_impressions * 100) if total_impressions > 0 else 0,
        })


@api_view(['GET'])
@permission_classes([AllowAny])
def get_active_ads(request):
    """
    Endpoint público para obtener anuncios activos.

    Filtros por placement:
    - home_banner: Solo clientes GOLD
    - sidebar: Clientes GOLD y SILVER
    - between_content: Clientes GOLD y SILVER
    - footer: Clientes GOLD y SILVER
    - popup: Solo clientes GOLD
    """
    placement = request.query_params.get('placement', 'home_banner')
    today = timezone.now().date()

    # Determinar qué planes son elegibles según el placement
    if placement in ['home_banner', 'popup']:
        # Solo Gold para ubicaciones premium
        allowed_plans = ['gold']
    else:
        # Gold y Silver para otras ubicaciones
        allowed_plans = ['gold', 'silver']

    ads = Advertisement.objects.filter(
        status='active',
        placement=placement,
        start_date__lte=today,
        end_date__gte=today,
        client__plan__in=allowed_plans,
        client__status='active'
    ).select_related('client').order_by('-priority')[:5]

    serializer = ActiveAdvertisementSerializer(ads, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def track_ad_impression(request, ad_id):
    try:
        ad = Advertisement.objects.get(id=ad_id)
        ad.increment_impressions()
        return Response({'status': 'success'})
    except Advertisement.DoesNotExist:
        return Response({'error': 'Advertisement not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([AllowAny])
def track_ad_click(request, ad_id):
    try:
        ad = Advertisement.objects.get(id=ad_id)
        ad.increment_clicks()
        return Response({'status': 'success'})
    except Advertisement.DoesNotExist:
        return Response({'error': 'Advertisement not found'}, status=status.HTTP_404_NOT_FOUND)