# apps/medico/serializers/surgical_case.py

from rest_framework import serializers
from apps.medico.models import SurgicalCase, CaseProcedure
from django.contrib.auth import get_user_model
from decimal import Decimal, ROUND_HALF_UP
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


class SurgicalCaseCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para crear/actualizar casos con procedimientos anidados"""

    procedures = CaseProcedureSerializer(many=True, required=False)

    is_operated = serializers.BooleanField(default=False, required=False)
    is_billed = serializers.BooleanField(default=False, required=False)
    is_paid = serializers.BooleanField(default=False, required=False)

    calendar_event_id = serializers.CharField(
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
            'calendar_event_id',
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
        read_only_fields = ['id', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        """Limpiar datos antes de validar"""
        cleaned_data = copy.deepcopy(data)

        # ✅ CRÍTICO: Validar que procedures existe y es una lista
        if 'procedures' not in cleaned_data:
            raise serializers.ValidationError({
                'procedures': 'El campo procedures es requerido'
            })

        if not isinstance(cleaned_data['procedures'], list):
            raise serializers.ValidationError({
                'procedures': 'Debe ser una lista de procedimientos'
            })

        if len(cleaned_data['procedures']) == 0:
            raise serializers.ValidationError({
                'procedures': 'Debe haber al menos un procedimiento'
            })

        # Limpiar procedimientos
        for proc in cleaned_data['procedures']:
            if 'calculated_value' in proc and proc['calculated_value']:
                try:
                    val = Decimal(str(proc['calculated_value']))
                    proc['calculated_value'] = val.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                except Exception as e:
                    print(f"⚠️ Error limpiando calculated_value: {e}")

        if 'assistant_doctor_name' in cleaned_data and cleaned_data['assistant_doctor_name'] == '':
            cleaned_data['assistant_doctor_name'] = None

        if 'calendar_event_id' in cleaned_data and cleaned_data['calendar_event_id'] == '':
            cleaned_data['calendar_event_id'] = None

        return super().to_internal_value(cleaned_data)

    def validate_patient_name(self, value):
        """Validar que el nombre no esté vacío"""
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre del paciente es requerido")
        return value.strip()

    def validate_procedures(self, value):
        """Validar que procedures sea una lista válida"""
        print(f"🔍 Validando procedures: {len(value) if value else 0} procedimientos")

        if not isinstance(value, list):
            raise serializers.ValidationError("Debe ser una lista de procedimientos")

        if len(value) == 0:
            raise serializers.ValidationError("Debe haber al menos un procedimiento")

        # Validar cada procedimiento
        for idx, proc in enumerate(value):
            if 'surgery_code' not in proc or not proc['surgery_code']:
                raise serializers.ValidationError(
                    f"Procedimiento {idx + 1}: surgery_code es requerido"
                )
            if 'surgery_name' not in proc or not proc['surgery_name']:
                raise serializers.ValidationError(
                    f"Procedimiento {idx + 1}: surgery_name es requerido"
                )
            if 'rvu' not in proc:
                raise serializers.ValidationError(
                    f"Procedimiento {idx + 1}: rvu es requerido"
                )

        return value

    def validate(self, data):
        """Validaciones de lógica de negocio"""
        print(f"📋 Validando data completa. Procedures: {len(data.get('procedures', []))}")

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
        print(f"🆕 Creando nuevo caso...")

        procedures_data = validated_data.pop('procedures', [])

        print(f"📊 Procedimientos a crear: {len(procedures_data)}")

        if len(procedures_data) == 0:
            raise serializers.ValidationError({
                'procedures': 'Debe haber al menos un procedimiento'
            })

        if 'assistant_accepted' not in validated_data or validated_data['assistant_accepted'] is None:
            validated_data['assistant_accepted'] = None

        # Obtener el hospital para el factor
        hospital = validated_data.get('hospital')
        hospital_factor = hospital.rate_multiplier if hospital else Decimal('1.00')

        print(f"🏥 Hospital factor: {hospital_factor}")

        # Crear el caso
        try:
            case = SurgicalCase.objects.create(**validated_data)
            print(f"✅ Caso creado con ID: {case.id}")
        except Exception as e:
            print(f"❌ Error creando caso: {str(e)}")
            import traceback
            print(traceback.format_exc())
            raise serializers.ValidationError(f"Error al crear el caso: {str(e)}")

        # Crear procedimientos
        created_procedures = []
        for index, proc_data in enumerate(procedures_data):
            try:
                # Asegurar valores numéricos
                rvu = Decimal(str(proc_data.get('rvu', 0)))
                factor = Decimal(str(proc_data.get('hospital_factor', hospital_factor)))

                # Calcular valor si no viene
                if 'calculated_value' not in proc_data or not proc_data['calculated_value']:
                    calculated_value = rvu * factor
                else:
                    calculated_value = Decimal(str(proc_data['calculated_value']))

                # Crear procedimiento
                procedure = CaseProcedure.objects.create(
                    case=case,
                    surgery_code=proc_data['surgery_code'],
                    surgery_name=proc_data['surgery_name'],
                    specialty=proc_data.get('specialty', ''),
                    grupo=proc_data.get('grupo', ''),
                    rvu=rvu,
                    hospital_factor=factor,
                    calculated_value=calculated_value,
                    notes=proc_data.get('notes', ''),
                    order=proc_data.get('order', index)
                )
                created_procedures.append(procedure)
                print(f"✅ Procedimiento {index + 1} creado: {procedure.surgery_name}")

            except Exception as e:
                print(f"❌ Error creando procedimiento {index + 1}: {str(e)}")
                import traceback
                print(traceback.format_exc())
                # ⚠️ NO silenciar el error - propagar
                raise serializers.ValidationError({
                    'procedures': f'Error creando procedimiento {index + 1}: {str(e)}'
                })

        print(f"✅ Total procedimientos creados: {len(created_procedures)}")

        # Refrescar para obtener relaciones
        case.refresh_from_db()
        return case

    def update(self, instance, validated_data):
        """Actualizar caso y sus procedimientos"""
        procedures_data = validated_data.pop('procedures', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if procedures_data is not None:
            # Eliminar procedimientos existentes
            instance.procedures.all().delete()

            # Crear nuevos procedimientos
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