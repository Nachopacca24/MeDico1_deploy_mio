# advertising/serializers.py

from rest_framework import serializers
from .models import Client, Advertisement
from django.utils import timezone
from urllib.parse import urlparse


class ClientSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    plan_display = serializers.CharField(source='get_plan_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)
    ad_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Client
        fields = [
            'id', 'company_name', 'contact_name', 'email', 'phone',
            'plan', 'plan_display', 'amount_paid', 'currency',
            'start_date', 'end_date', 'status', 'status_display',
            'notes', 'created_by', 'created_by_name',
            'created_at', 'updated_at',
            'is_active', 'days_remaining', 'ad_count'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']


class AdvertisementSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.company_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    placement_display = serializers.CharField(source='get_placement_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    ctr = serializers.FloatField(read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Advertisement
        fields = [
            'id', 'client', 'client_name', 'campaign_name', 'title', 'description',
            'image', 'image_url', 'image_alt_text', 'redirect_url', 'open_in_new_tab',
            'placement', 'placement_display', 'priority',
            'start_date', 'end_date', 'status', 'status_display',
            'impressions', 'clicks', 'ctr', 'is_active',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at', 'impressions', 'clicks']

    def get_image_url(self, obj):
        if obj.image:
            try:
                # CloudinaryField returns a CloudinaryResource which has a .url property
                url = obj.image.url
                
                # Ensure HTTPS
                if url.startswith('http://'):
                    url = url.replace('http://', 'https://', 1)
                
                return url
            except Exception as e:
                print(f"DEBUG AD IMAGE ERROR: {str(e)}")
                return None
        return None

    def validate_redirect_url(self, value):
        """
        Validación de seguridad para redirect_url.
        Previene redirecciones a URLs internas o maliciosas.
        """
        if not value:
            raise serializers.ValidationError("La URL de redirección es requerida.")
        
        try:
            parsed = urlparse(value)
            
            if not parsed.scheme:
                raise serializers.ValidationError("La URL debe incluir http:// o https://")
            
            if parsed.scheme not in ['http', 'https']:
                raise serializers.ValidationError("Solo se permiten URLs con http:// o https://")
            
            if not parsed.netloc:
                raise serializers.ValidationError("La URL debe incluir un dominio válido")
            
            blocked_domains = [
                'localhost', '127.0.0.1', '0.0.0.0',
            ]
            
            netloc_lower = parsed.netloc.lower()
            for blocked in blocked_domains:
                if netloc_lower.startswith(blocked):
                    raise serializers.ValidationError(
                        "No se permiten URLs a servidores locales o internos. "
                        "Debe ser una URL pública externa."
                    )
            
            blocked_paths = []
            path_lower = parsed.path.lower()
            for blocked_path in blocked_paths:
                if path_lower.startswith(blocked_path):
                    raise serializers.ValidationError("No se permiten URLs a rutas administrativas.")
            
            return value
            
        except ValueError:
            raise serializers.ValidationError("URL inválida")


class AdvertisementListSerializer(serializers.ModelSerializer):
    """Serializer para listar anuncios - INCLUYE TODOS LOS CAMPOS"""
    client_name = serializers.CharField(source='client.company_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    placement_display = serializers.CharField(source='get_placement_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    ctr = serializers.FloatField(read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Advertisement
        fields = [
            'id', 'client', 'client_name', 'campaign_name', 'title', 'description',
            'image_url', 'image_alt_text', 'redirect_url', 'open_in_new_tab',
            'placement', 'placement_display', 'priority',
            'status', 'status_display',
            'start_date', 'end_date',
            'impressions', 'clicks', 'ctr', 'is_active',
            'created_by_name', 'created_at', 'updated_at'
        ]

    def get_image_url(self, obj):
        if obj.image:
            try:
                # CloudinaryField returns a CloudinaryResource which has a .url property
                url = obj.image.url
                
                # Ensure HTTPS
                if url.startswith('http://'):
                    url = url.replace('http://', 'https://', 1)
                
                return url
            except Exception as e:
                print(f"DEBUG AD IMAGE ERROR: {str(e)}")
                return None
        return None


class ActiveAdvertisementSerializer(serializers.ModelSerializer):
    """
    Serializer público para anuncios activos.
    Solo expone información mínima necesaria.
    NO expone información sensible del cliente.
    """
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Advertisement
        fields = [
            'id',
            'title',
            'image_url',
            'image_alt_text',
            'redirect_url',
            'open_in_new_tab',
            'placement'
        ]

    def get_image_url(self, obj):
        if obj.image:
            # CloudinaryField returns a CloudinaryResource which has a .url property
            # For Cloudinary, we don't need build_absolute_uri as the URL is already absolute
            url = obj.image.url
            if url.startswith('http://'):
                url = url.replace('http://', 'https://', 1)
            return url
        return None