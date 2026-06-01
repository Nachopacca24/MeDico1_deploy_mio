from rest_framework import serializers, viewsets
from rest_framework.permissions import IsAuthenticated
from apps.medico.models import InsuranceCompany


class InsuranceCompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = InsuranceCompany
        fields = ['id', 'name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class InsuranceCompanyViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InsuranceCompanySerializer
    permission_classes = [IsAuthenticated]
    queryset = InsuranceCompany.objects.all().order_by('name')
