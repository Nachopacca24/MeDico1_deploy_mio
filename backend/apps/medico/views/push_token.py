from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from apps.medico.models import FCMToken


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def manage_push_token(request):
    token = request.data.get('token', '').strip()
    if not token:
        return Response({'error': 'token requerido'}, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'POST':
        platform = request.data.get('platform', 'android')
        # Delete stale tokens for same user+platform before registering new one
        FCMToken.objects.filter(user=request.user, platform=platform).exclude(token=token).delete()
        FCMToken.objects.update_or_create(
            token=token,
            defaults={'user': request.user, 'platform': platform},
        )
        return Response({'status': 'registered'})

    # DELETE
    FCMToken.objects.filter(user=request.user, token=token).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
