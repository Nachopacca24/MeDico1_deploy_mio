# apps/medico/serializers/surgical_case.py

"""
Serializers para casos quirúrgicos y procedimientos
"""
from rest_framework import serializers
from apps.medico.models import SurgicalCase, CaseProcedure
from django.contrib.auth import get_user_model
from apps.medico.crypto_utils import encrypt_field, decrypt_field
import copy

User = get_user_model()


class CaseProcedureSerializer(serializers.ModelSerializer):
    """Serializer para procedimientos individuales dentro de un caso"""

    calculated_value = serializers.DecimalField(
        max_digits=15,
        decimal_places=2,
        required=False,
        allow_null=True
    )

    class Meta:
        model = CaseProcedure
        fields = [
            'id',
            'surgery_code',
            'surgery_name',
            'specialty',
            'grupo',
            'rvu',
            'hospital_factor',
            'calculated_value',
            'notes',
            'order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_rvu(self, value):
        """Validar que RVU sea positivo"""
        if value < 0:
            raise serializers.ValidationError("RVU debe ser un valor positivo")
        return value

    def validate_calculated_value(self, value):
        """Validar que el valor calculado sea positivo"""
        if value < 0:
            raise serializers.ValidationError("El valor calculado debe ser positivo")
        return value


class SurgicalCaseListSerializer(serializers.ModelSerializer):
    """Serializer para listado de casos (vista resumida)"""

    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    total_rvu = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_value = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    procedure_count = serializers.IntegerField(read_only=True)
    primary_specialty = serializers.CharField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    procedures = CaseProcedureSerializer(many=True, read_only=True)

    is_operated = serializers.BooleanField(default=False)
    is_billed = serializers.BooleanField(default=False)
    is_paid = serializers.BooleanField(default=False)

    assistant_display_name = serializers.CharField(read_only=True)
    assistant_accepted = serializers.BooleanField(read_only=True, allow_null=True)

    anesthesiologist_display = serializers.SerializerMethodField()
    anesthesiologist_accepted = serializers.SerializerMethodField()
    is_anesthesiologist = serializers.SerializerMethodField()
    anesthesia_total_fee = serializers.SerializerMethodField()
    anesthesia_item_count = serializers.SerializerMethodField()
    anesthesia_is_operated = serializers.SerializerMethodField()
    anesthesia_is_billed = serializers.SerializerMethodField()
    anesthesia_is_paid = serializers.SerializerMethodField()
    anesthesia_invoice_number = serializers.SerializerMethodField()
    anesthesia_items = serializers.SerializerMethodField()
    anesthesia_notes = serializers.SerializerMethodField()

    # Estados del ayudante (solo visibles cuando el usuario ES el ayudante)
    assistant_is_operated_own = serializers.SerializerMethodField()
    assistant_is_billed_own = serializers.SerializerMethodField()
    assistant_is_paid_own = serializers.SerializerMethodField()
    assistant_invoice_number_own = serializers.SerializerMethodField()

    was_removed_as = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    insurance_company_name = serializers.CharField(source='insurance_company.name', read_only=True, allow_null=True)

    def get_anesthesiologist_display(self, obj):
        try:
            a = obj.anesthesia
            if a.anesthesiologist:
                return a.anesthesiologist.get_full_name() or a.anesthesiologist.username
            return a.anesthesiologist_name or None
        except Exception:
            return None

    def get_anesthesiologist_accepted(self, obj):
        try:
            return obj.anesthesia.anesthesiologist_accepted
        except Exception:
            return None

    def get_is_anesthesiologist(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return False
        try:
            return obj.anesthesia.anesthesiologist == request.user and obj.anesthesia.anesthesiologist_accepted is True
        except Exception:
            return False

    def get_anesthesia_total_fee(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return None
        try:
            a = obj.anesthesia
            if a.anesthesiologist == request.user and a.anesthesiologist_accepted is True:
                return float(a.total_fee)
            return None
        except Exception:
            return None

    def _get_anesthesia_for_user(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return None
        try:
            a = obj.anesthesia
            if a.anesthesiologist == request.user and a.anesthesiologist_accepted is True:
                return a
        except Exception:
            pass
        return None

    def get_anesthesia_item_count(self, obj):
        try:
            return obj.anesthesia.items.count()
        except Exception:
            return None

    def get_anesthesia_is_operated(self, obj):
        a = self._get_anesthesia_for_user(obj)
        return a.is_operated if a else None

    def get_anesthesia_is_billed(self, obj):
        a = self._get_anesthesia_for_user(obj)
        return a.is_billed if a else None

    def get_anesthesia_is_paid(self, obj):
        a = self._get_anesthesia_for_user(obj)
        return a.is_paid if a else None

    def get_anesthesia_invoice_number(self, obj):
        a = self._get_anesthesia_for_user(obj)
        return a.invoice_number if a else None

    def get_anesthesia_items(self, obj):
        try:
            return [
                {'surgery_code': i.surgery_code, 'surgery_name': i.surgery_name}
                for i in obj.anesthesia.items.all()
            ]
        except Exception:
            return []

    def get_anesthesia_notes(self, obj):
        try:
            return obj.anesthesia.notes or None
        except Exception:
            return None

    def _is_assistant_for_user(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return False
        return obj.assistant_doctor == request.user and obj.assistant_accepted is True

    def get_assistant_is_operated_own(self, obj):
        return obj.assistant_is_operated if self._is_assistant_for_user(obj) else None

    def get_assistant_is_billed_own(self, obj):
        return obj.assistant_is_billed if self._is_assistant_for_user(obj) else None

    def get_assistant_is_paid_own(self, obj):
        return obj.assistant_is_paid if self._is_assistant_for_user(obj) else None

    def get_assistant_invoice_number_own(self, obj):
        return obj.assistant_invoice_number if self._is_assistant_for_user(obj) else None

    class Meta:
        model = SurgicalCase
        fields = [
            'id',
            'patient_name',
            'patient_name_for_assistant',
            'surgery_date',
            'surgery_time',
            'surgery_end_time',
            'calendar_event_id',
            'assistant_calendar_event_id',
            'anesthesiologist_calendar_event_id',
            'hospital',
            'hospital_name',
            'status',
            'status_display',
            'is_operated',
            'is_billed',
            'is_paid',
            'invoice_number',
            'surgeon_name',
            'assistant_doctor',
            'assistant_doctor_name',
            'assistant_display_name',
            'assistant_accepted',
            'anesthesiologist_display',
            'anesthesiologist_accepted',
            'is_anesthesiologist',
            'anesthesia_total_fee',
            'anesthesia_item_count',
            'anesthesia_is_operated',
            'anesthesia_is_billed',
            'anesthesia_is_paid',
            'anesthesia_invoice_number',
            'anesthesia_items',
            'anesthesia_notes',
            'assistant_is_operated_own',
            'assistant_is_billed_own',
            'assistant_is_paid_own',
            'assistant_invoice_number_own',
            'was_removed_as',
            'total_rvu',
            'total_value',
            'procedure_count',
            'procedures',
            'primary_specialty',
            'can_edit',
            'is_owner',
            'created_at',
            'updated_at',
            'created_by_name',
            'archived_at',
            'images_purge_at',
            'insurance_company',
            'insurance_company_name',
            'patient_age',
            'diagnosis',
            'notes',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['patient_name'] = decrypt_field(data.get('patient_name'))
        data['patient_name_for_assistant'] = decrypt_field(data.get('patient_name_for_assistant'))
        data['diagnosis'] = decrypt_field(data.get('diagnosis'))
        data['notes'] = decrypt_field(data.get('notes'))
        return data

    def get_was_removed_as(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return None
        removal = obj.collaborator_removals.filter(
            removed_user=request.user, acknowledged=False
        ).first()
        return removal.role if removal else None

    def get_can_edit(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return False
        return obj.can_be_edited_by(request.user)

    def get_is_owner(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return False
        return obj.created_by == request.user


class SurgicalCaseDetailSerializer(serializers.ModelSerializer):
    """Serializer detallado para casos incluyendo todos los procedimientos"""

    procedures = CaseProcedureSerializer(many=True, read_only=True)
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    total_rvu = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_value = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    procedure_count = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    is_operated = serializers.BooleanField(default=False)
    is_billed = serializers.BooleanField(default=False)
    is_paid = serializers.BooleanField(default=False)

    assistant_display_name = serializers.CharField(read_only=True)
    assistant_accepted = serializers.BooleanField(read_only=True, allow_null=True)
    assistant_notified_at = serializers.DateTimeField(read_only=True)

    is_anesthesiologist = serializers.SerializerMethodField()

    can_edit = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    insurance_company_name = serializers.CharField(source='insurance_company.name', read_only=True, allow_null=True)

    def get_is_anesthesiologist(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return False
        try:
            return obj.anesthesia.anesthesiologist == request.user and obj.anesthesia.anesthesiologist_accepted is True
        except Exception:
            return False

    class Meta:
        model = SurgicalCase
        fields = [
            'id',
            'patient_name',
            'patient_name_for_assistant',
            'patient_id',
            'patient_age',
            'patient_gender',
            'hospital',
            'hospital_name',
            'surgery_date',
            'surgery_time',
            'surgery_end_time',
            'calendar_event_id',
            'assistant_calendar_event_id',
            'anesthesiologist_calendar_event_id',
            'status',
            'status_display',
            'is_operated',
            'is_billed',
            'is_paid',
            'invoice_number',
            'surgeon_name',
            'assistant_doctor',
            'assistant_doctor_name',
            'assistant_display_name',
            'assistant_accepted',
            'assistant_notified_at',
            'is_anesthesiologist',
            'notes',
            'diagnosis',
            'insurance_company',
            'insurance_company_name',
            'equipment_name',
            'equipment_cost',
            'procedures',
            'total_rvu',
            'total_value',
            'procedure_count',
            'created_by',
            'created_by_name',
            'can_edit',
            'is_owner',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['patient_name'] = decrypt_field(data.get('patient_name'))
        data['patient_id'] = decrypt_field(data.get('patient_id'))
        data['diagnosis'] = decrypt_field(data.get('diagnosis'))
        data['notes'] = decrypt_field(data.get('notes'))
        data['patient_name_for_assistant'] = decrypt_field(data.get('patient_name_for_assistant'))
        return data

    def get_can_edit(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return False
        return obj.can_be_edited_by(request.user)

    def get_is_owner(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return False
        return obj.created_by == request.user


class SurgicalCaseCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para crear/actualizar casos con procedimientos anidados"""

    procedures = CaseProcedureSerializer(many=True, required=False)
    insurance_company_name = serializers.CharField(source='insurance_company.name', read_only=True, allow_null=True)

    is_operated = serializers.BooleanField(default=False, required=False)
    is_billed = serializers.BooleanField(default=False, required=False)
    is_paid = serializers.BooleanField(default=False, required=False)

    calendar_event_id = serializers.CharField(
        max_length=255,
        required=False,
        allow_null=True,
        allow_blank=True
    )

    surgeon_name = serializers.CharField(
        max_length=255,
        required=False,
        allow_null=True,
        allow_blank=True
    )
    assistant_doctor = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True
    )
    assistant_doctor_name = serializers.CharField(
        max_length=255,
        required=False,
        allow_null=True,
        allow_blank=True
    )
    assistant_accepted = serializers.BooleanField(
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = SurgicalCase
        fields = [
            'id',
            'patient_name',
            'patient_name_for_assistant',
            'patient_id',
            'patient_age',
            'patient_gender',
            'hospital',
            'surgery_date',
            'surgery_time',
            'surgery_end_time',
            'calendar_event_id',
            'status',
            'notes',
            'diagnosis',
            'insurance_company',
            'insurance_company_name',
            'is_operated',
            'is_billed',
            'is_paid',
            'invoice_number',
            'surgeon_name',
            'assistant_doctor',
            'assistant_doctor_name',
            'assistant_accepted',
            'equipment_name',
            'equipment_cost',
            'procedures',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        """Limpiar datos antes de validar"""
        cleaned_data = copy.deepcopy(data)

        if 'procedures' in cleaned_data and isinstance(cleaned_data['procedures'], list):
            for proc in cleaned_data['procedures']:
                if 'calculated_value' in proc and proc['calculated_value']:
                    try:
                        from decimal import Decimal, ROUND_HALF_UP
                        val = Decimal(str(proc['calculated_value']))
                        proc['calculated_value'] = val.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                    except:
                        pass

        if 'assistant_doctor_name' in cleaned_data:
            if cleaned_data['assistant_doctor_name'] == '':
                cleaned_data['assistant_doctor_name'] = None

        if 'surgeon_name' in cleaned_data:
            if cleaned_data['surgeon_name'] == '':
                cleaned_data['surgeon_name'] = None

        if 'calendar_event_id' in cleaned_data:
            if cleaned_data['calendar_event_id'] == '':
                cleaned_data['calendar_event_id'] = None

        if 'procedures' in cleaned_data:
            if not isinstance(cleaned_data['procedures'], list):
                raise serializers.ValidationError({
                    'procedures': 'Debe ser una lista de procedimientos'
                })

        return super().to_internal_value(cleaned_data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['patient_name'] = decrypt_field(data.get('patient_name'))
        data['patient_id'] = decrypt_field(data.get('patient_id'))
        data['diagnosis'] = decrypt_field(data.get('diagnosis'))
        data['notes'] = decrypt_field(data.get('notes'))
        data['patient_name_for_assistant'] = decrypt_field(data.get('patient_name_for_assistant'))
        return data

    def validate_patient_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre del paciente es requerido")
        return value.strip()

    def validate_procedures(self, value):
        """Validar que procedures sea una lista válida"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Debe ser una lista de procedimientos")
        return value

    def validate(self, data):
        """Validaciones de lógica de negocio"""
        status_val = data.get('status')
        if status_val is not None:
            _VALID_STATUSES = {'scheduled', 'completed', 'billed', 'paid', 'cancelled'}
            if status_val not in _VALID_STATUSES:
                raise serializers.ValidationError({'status': 'Estado no válido'})

        assistant_doctor = data.get('assistant_doctor')
        assistant_doctor_name = data.get('assistant_doctor_name')

        if assistant_doctor and assistant_doctor_name:
            raise serializers.ValidationError({
                'assistant_doctor_name': 'No puedes tener un colega registrado y un nombre manual al mismo tiempo'
            })

        if 'assistant_doctor' in data:
            if data['assistant_doctor'] is None:
                data['assistant_accepted'] = None
            elif not self.instance or (self.instance and self.instance.assistant_doctor != data['assistant_doctor']):
                data['assistant_accepted'] = None

        if 'assistant_doctor_name' in data and not data['assistant_doctor_name']:
            data['assistant_doctor_name'] = None

        is_operated = data.get('is_operated', getattr(self.instance, 'is_operated', False) if self.instance else False)
        is_billed = data.get('is_billed', getattr(self.instance, 'is_billed', False) if self.instance else False)
        is_paid = data.get('is_paid', getattr(self.instance, 'is_paid', False) if self.instance else False)

        if is_billed and not is_operated:
            raise serializers.ValidationError({
                'is_billed': 'No se puede marcar como facturado sin estar operado'
            })

        if is_paid and not is_billed:
            raise serializers.ValidationError({
                'is_paid': 'No se puede marcar como cobrado sin estar facturado'
            })

        return data

    def _encrypt_sensitive_fields(self, data: dict) -> dict:
        """Encrypt patient-sensitive fields before writing to DB."""
        for field in ('patient_name', 'patient_id', 'diagnosis', 'notes', 'patient_name_for_assistant'):
            if data.get(field):
                data[field] = encrypt_field(data[field])
        return data

    def create(self, validated_data):
        """Crear caso con procedimientos anidados"""
        procedures_data = validated_data.pop('procedures', [])

        if 'assistant_accepted' not in validated_data or validated_data['assistant_accepted'] is None:
            validated_data['assistant_accepted'] = None

        # Auto-fill patient_name_for_assistant with same value as patient_name
        if not validated_data.get('patient_name_for_assistant') and validated_data.get('patient_name'):
            validated_data['patient_name_for_assistant'] = validated_data['patient_name']

        self._encrypt_sensitive_fields(validated_data)

        from decimal import Decimal
        hospital_factor = Decimal('1.00')

        try:
            case = SurgicalCase.objects.create(**validated_data)
        except Exception as e:
            import traceback
            raise serializers.ValidationError(f"Error al crear el caso: {str(e)}")

        if procedures_data:
            CaseProcedure.objects.bulk_create([
                CaseProcedure(
                    case=case,
                    surgery_code=proc_data['surgery_code'],
                    surgery_name=proc_data['surgery_name'],
                    specialty=proc_data.get('specialty', ''),
                    grupo=proc_data.get('grupo', ''),
                    rvu=Decimal(str(proc_data.get('rvu', 0))),
                    hospital_factor=Decimal(str(proc_data.get('hospital_factor', hospital_factor))),
                    calculated_value=(
                        Decimal(str(proc_data['calculated_value']))
                        if proc_data.get('calculated_value')
                        else Decimal(str(proc_data.get('rvu', 0))) * Decimal(str(proc_data.get('hospital_factor', hospital_factor)))
                    ),
                    notes=proc_data.get('notes', ''),
                    order=proc_data.get('order', index),
                )
                for index, proc_data in enumerate(procedures_data)
            ])

        return case

    def update(self, instance, validated_data):
        """Actualizar caso y sus procedimientos"""
        procedures_data = validated_data.pop('procedures', None)

        # Auto-fill patient_name_for_assistant if not provided
        if not validated_data.get('patient_name_for_assistant') and validated_data.get('patient_name'):
            validated_data['patient_name_for_assistant'] = validated_data['patient_name']

        self._encrypt_sensitive_fields(validated_data)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # If a linked colleague is set, clear the manual name to avoid validation conflict
        if instance.assistant_doctor_id and instance.assistant_doctor_name:
            instance.assistant_doctor_name = None

        instance.save()

        if procedures_data is not None:
            instance.procedures.all().delete()
            if procedures_data:
                CaseProcedure.objects.bulk_create([
                    CaseProcedure(case=instance, order=idx, **{k: v for k, v in proc_data.items() if k != 'order'})
                    for idx, proc_data in enumerate(procedures_data)
                ])

        return instance


class CaseStatsSerializer(serializers.Serializer):
    """Serializer para estadísticas de casos"""

    total_cases = serializers.IntegerField()
    total_procedures = serializers.IntegerField()
    total_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    cases_by_status = serializers.DictField()
    cases_by_specialty = serializers.DictField()
    recent_cases = SurgicalCaseListSerializer(many=True)