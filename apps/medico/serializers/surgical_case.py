# apps/medico/serializers/surgical_case.py

"""
Serializers para casos quirúrgicos y procedimientos
"""
from rest_framework import serializers
from apps.medico.models import SurgicalCase, CaseProcedure
from django.contrib.auth import get_user_model
import copy

User = get_user_model()


class CaseProcedureSerializer(serializers.ModelSerializer):
    """Serializer para procedimientos individuales dentro de un caso"""
    
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
    
    
    # Campos de estado
    is_operated = serializers.BooleanField(default=False)
    is_billed = serializers.BooleanField(default=False)
    is_paid = serializers.BooleanField(default=False)
    
    # Campos de médico ayudante
    assistant_display_name = serializers.CharField(read_only=True)
    assistant_accepted = serializers.BooleanField(read_only=True, allow_null=True)
    
    # Permisos
    can_edit = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    
    class Meta:
        model = SurgicalCase
        fields = [
            'id',
            'patient_name',
            'surgery_date',
            'surgery_time',
            'surgery_end_time',
            'calendar_event_id',
            'hospital',
            'hospital_name',
            'status',
            'status_display',
            'is_operated',
            'is_billed',
            'is_paid',
            'assistant_doctor',
            'assistant_doctor_name',
            'assistant_display_name',
            'assistant_accepted',
            'total_rvu',
            'total_value',
            'procedure_count',
            'primary_specialty',
            'can_edit',
            'is_owner',
            'created_at',
            'updated_at',
            'created_by_name',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_can_edit(self, obj):
        """Verificar si el usuario actual puede editar"""
        request = self.context.get('request')
        if not request or not request.user:
            return False
        return obj.can_be_edited_by(request.user)
    
    def get_is_owner(self, obj):
        """Verificar si el usuario actual es el dueño"""
        request = self.context.get('request')
        if not request or not request.user:
            return False
        return obj.created_by == request.user


class SurgicalCaseDetailSerializer(serializers.ModelSerializer):
    """Serializer detallado para casos incluyendo todos los procedimientos"""
    
    procedures = CaseProcedureSerializer(many=True, read_only=True)
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    hospital_rate_multiplier = serializers.DecimalField(
        source='hospital.rate_multiplier',
        max_digits=5,
        decimal_places=2,
        read_only=True
    )
    total_rvu = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_value = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    procedure_count = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    # Campos de estado
    is_operated = serializers.BooleanField(default=False)
    is_billed = serializers.BooleanField(default=False)
    is_paid = serializers.BooleanField(default=False)
    
    # Campos de médico ayudante
    assistant_display_name = serializers.CharField(read_only=True)
    assistant_accepted = serializers.BooleanField(read_only=True, allow_null=True)
    assistant_notified_at = serializers.DateTimeField(read_only=True)
    
    # Permisos
    can_edit = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    
    class Meta:
        model = SurgicalCase
        fields = [
            'id',
            'patient_name',
            'patient_id',
            'patient_age',
            'patient_gender',
            'hospital',
            'hospital_name',
            'hospital_rate_multiplier',
            'surgery_date',
            'surgery_time',
            'surgery_end_time',
            'calendar_event_id',
            'status',
            'status_display',
            'is_operated',
            'is_billed',
            'is_paid',
            'assistant_doctor',
            'assistant_doctor_name',
            'assistant_display_name',
            'assistant_accepted',
            'assistant_notified_at',
            'notes',
            'diagnosis',
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
    
    def get_can_edit(self, obj):
        """Verificar si el usuario actual puede editar"""
        request = self.context.get('request')
        if not request or not request.user:
            return False
        return obj.can_be_edited_by(request.user)
    
    def get_is_owner(self, obj):
        """Verificar si el usuario actual es el dueño"""
        request = self.context.get('request')
        if not request or not request.user:
            return False
        return obj.created_by == request.user


class SurgicalCaseCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para crear/actualizar casos con procedimientos anidados"""
    
    procedures = CaseProcedureSerializer(many=True, required=False)
    
    # Campos de estado (opcionales en creación/actualización)
    is_operated = serializers.BooleanField(default=False, required=False)
    is_billed = serializers.BooleanField(default=False, required=False)
    is_paid = serializers.BooleanField(default=False, required=False)
    
    # ✅ calendar_event_id ahora es writable (no en read_only)
    calendar_event_id = serializers.CharField(
        max_length=255,
        required=False,
        allow_null=True,
        allow_blank=True
    )
    
    # Campos de médico ayudante (opcionales)
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
        required=False,
        allow_null=True,
        default=None
    )
    
    class Meta:
        model = SurgicalCase
        fields = [
            'id',
            'patient_name',
            'patient_id',
            'patient_age',
            'patient_gender',
            'hospital',
            'surgery_date',
            'surgery_time',
            'surgery_end_time',
            'calendar_event_id',  # ✅ Ahora es writable
            'status',
            'notes',
            'diagnosis',
            'is_operated',
            'is_billed',
            'is_paid',
            'assistant_doctor',
            'assistant_doctor_name',
            'assistant_accepted',
            'procedures',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']  # ✅ calendar_event_id REMOVIDO
    
    def to_internal_value(self, data):
        """Limpiar datos antes de validar"""
        cleaned_data = copy.deepcopy(data)
        
        if 'assistant_doctor_name' in cleaned_data:
            if cleaned_data['assistant_doctor_name'] == '':
                cleaned_data['assistant_doctor_name'] = None
        
        # ✅ Limpiar calendar_event_id vacío
        if 'calendar_event_id' in cleaned_data:
            if cleaned_data['calendar_event_id'] == '':
                cleaned_data['calendar_event_id'] = None
        
        if 'procedures' in cleaned_data:
            if not isinstance(cleaned_data['procedures'], list):
                raise serializers.ValidationError({
                    'procedures': 'Debe ser una lista de procedimientos'
                })
        
        return super().to_internal_value(cleaned_data)
    
    def validate_patient_name(self, value):
        """Validar que el nombre no esté vacío"""
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre del paciente es requerido")
        return value.strip()
    
    def validate_procedures(self, value):
        """Validar que procedures sea una lista válida"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Debe ser una lista de procedimientos")
        
        if len(value) == 0:
            raise serializers.ValidationError("Debe haber al menos un procedimiento")
        
        return value
    
    def validate(self, data):
        """Validaciones de lógica de negocio"""
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
    
    def create(self, validated_data):
        """Crear caso con procedimientos anidados"""
        procedures_data = validated_data.pop('procedures', [])
        
        if 'assistant_accepted' not in validated_data or validated_data['assistant_accepted'] is None:
            validated_data['assistant_accepted'] = None
        
        # Log to debug 500 error
        print(f"DEBUG: Creating SurgicalCase with data: {validated_data}")
        
        try:
            # Asegurarse de que el usuario creador esté en los datos si no viene de perform_create
            case = SurgicalCase.objects.create(**validated_data)
            print(f"DEBUG: SurgicalCase created with ID: {case.id}")
        except Exception as e:
            import traceback
            print(f"DEBUG ERROR: Failed to create SurgicalCase: {str(e)}")
            print(traceback.format_exc())
            raise serializers.ValidationError(f"Error al crear el caso: {str(e)}")
        
        # Batch create procedures for better performance
        if procedures_data:
            print(f"DEBUG: Creating {len(procedures_data)} procedures")
            procedures = []
            for index, proc_data in enumerate(procedures_data):
                # Ensure values are Decimal for calculation
                try:
                    rvu = Decimal(str(proc_data.get('rvu', 0)))
                    factor = Decimal(str(proc_data.get('hospital_factor', 1)))
                    if 'calculated_value' not in proc_data or not proc_data['calculated_value']:
                        proc_data['calculated_value'] = rvu * factor
                    
                    procedures.append(
                        CaseProcedure(
                            case=case,
                            order=index if 'order' not in proc_data else proc_data['order'],
                            **proc_data
                        )
                    )
                except Exception as e:
                    print(f"DEBUG ERROR: Procedure data processing failed: {str(e)}")
                    continue

            if procedures:
                try:
                    CaseProcedure.objects.bulk_create(procedures)
                    print("DEBUG: Procedures bulk created successfully")
                except Exception as e:
                    import traceback
                    print(f"DEBUG ERROR: Failed to bulk create procedures: {str(e)}")
                    print(traceback.format_exc())
                    # Intentar borrar el caso para evitar datos inconsistentes
                    case.delete()
                    raise serializers.ValidationError(f"Error al crear los procedimientos: {str(e)}")
        
        return case
    
    def update(self, instance, validated_data):
        """Actualizar caso y sus procedimientos"""
        procedures_data = validated_data.pop('procedures', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        
        if procedures_data is not None:
            instance.procedures.all().delete()
            
            for idx, proc_data in enumerate(procedures_data):
                proc_data['order'] = idx
                
                CaseProcedure.objects.create(
                    case=instance,
                    **proc_data
                )
        
        return instance


class CaseStatsSerializer(serializers.Serializer):
    """Serializer para estadísticas de casos"""
    
    total_cases = serializers.IntegerField()
    total_procedures = serializers.IntegerField()
    total_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    cases_by_status = serializers.DictField()
    cases_by_specialty = serializers.DictField()
    recent_cases = SurgicalCaseListSerializer(many=True)