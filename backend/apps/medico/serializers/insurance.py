from rest_framework import serializers, viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.medico.models import InsuranceCompany, FavoriteInsurance


class InsuranceCompanySerializer(serializers.ModelSerializer):
    is_favorite = serializers.SerializerMethodField()

    class Meta:
        model = InsuranceCompany
        fields = ['id', 'name', 'created_at', 'updated_at', 'is_favorite']
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_favorite']

    def get_is_favorite(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return FavoriteInsurance.objects.filter(user=request.user, insurance=obj).exists()
        return False


class InsuranceCompanyViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InsuranceCompanySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        from django.db.models import Case, When, IntegerField
        queryset = InsuranceCompany.objects.all()
        if self.request.user.is_authenticated:
            fav_ids = list(FavoriteInsurance.objects.filter(
                user=self.request.user
            ).values_list('insurance_id', flat=True))
            if fav_ids:
                queryset = queryset.annotate(
                    is_fav=Case(
                        When(id__in=fav_ids, then=0),
                        default=1,
                        output_field=IntegerField()
                    )
                ).order_by('is_fav', 'name')
            else:
                queryset = queryset.order_by('name')
        else:
            queryset = queryset.order_by('name')
        return queryset

    @action(detail=True, methods=['post'])
    def favorite(self, request, pk=None):
        insurance = self.get_object()
        _, created = FavoriteInsurance.objects.get_or_create(user=request.user, insurance=insurance)
        if created:
            return Response({'status': 'added', 'message': f'{insurance.name} agregado a favoritos'}, status=status.HTTP_201_CREATED)
        return Response({'status': 'already_favorite'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['delete'])
    def unfavorite(self, request, pk=None):
        insurance = self.get_object()
        deleted, _ = FavoriteInsurance.objects.filter(user=request.user, insurance=insurance).delete()
        if deleted:
            return Response({'status': 'removed'}, status=status.HTTP_204_NO_CONTENT)
        return Response({'status': 'not_favorite'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def favorites(self, request):
        favs = FavoriteInsurance.objects.filter(user=request.user).select_related('insurance')
        data = [InsuranceCompanySerializer(f.insurance, context={'request': request}).data for f in favs]
        return Response(data)
