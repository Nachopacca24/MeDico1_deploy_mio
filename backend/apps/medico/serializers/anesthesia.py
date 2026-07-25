from rest_framework import serializers
from apps.medico.models.anesthesia import AnesthesiaCase, AnesthesiaItem


class AnesthesiaItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnesthesiaItem
        fields = ['id', 'surgery_code', 'surgery_name', 'base_units', 'order', 'created_at']
        read_only_fields = ['id', 'created_at']


class AnesthesiaCaseSerializer(serializers.ModelSerializer):
    items = AnesthesiaItemSerializer(many=True, read_only=True)
    total_base_units = serializers.FloatField(read_only=True)
    total_units = serializers.FloatField(read_only=True)
    total_fee = serializers.FloatField(read_only=True)
    anesthesiologist_display = serializers.SerializerMethodField()

    def get_anesthesiologist_display(self, obj):
        if obj.anesthesiologist:
            return obj.anesthesiologist.get_full_name() or obj.anesthesiologist.username
        return obj.anesthesiologist_name or None

    class Meta:
        model = AnesthesiaCase
        fields = [
            'id', 'case', 'unit_value',
            'time_units', 'time_minutes',
            'anesthesiologist_name', 'anesthesiologist', 'anesthesiologist_display',
            'anesthesiologist_accepted',
            'notes', 'items',
            'total_base_units', 'total_units', 'total_fee',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'case', 'created_at', 'updated_at']


class AnesthesiaCaseWriteSerializer(serializers.ModelSerializer):
    """Para crear/actualizar la sesión de anestesia."""
    time_minutes = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = AnesthesiaCase
        fields = [
            'unit_value', 'time_units', 'time_minutes',
            'anesthesiologist_name', 'anesthesiologist', 'notes',
        ]

    def validate(self, attrs):
        # Si se pasan minutos, calcular las unidades de tiempo automáticamente
        minutes = attrs.get('time_minutes')
        if minutes is not None and minutes > 0:
            attrs['time_units'] = round(minutes / 15, 2)
        return attrs
