from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate, login, logout

# Create your views here.

# class AuthViewSet(viewsets.ViewSet):
#     """
#     ViewSet para manejo de autenticación
#     """
#     permission_classes = [AllowAny]
#     
#     @action(detail=False, methods=['post'])
#     def login(self, request):
#         """Login de usuario"""
#         pass
#     
#     @action(detail=False, methods=['post'])
#     def register(self, request):
#         """Registro de nuevo usuario"""
#         pass
#     
#     @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
#     def logout(self, request):
#         """Logout de usuario"""
#         pass
