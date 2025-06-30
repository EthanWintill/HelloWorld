from django.shortcuts import render
from django.views.generic import TemplateView
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.http import JsonResponse

class LandingPageView(TemplateView):
    """Landing page view"""
    template_name = 'landing.html'

class LoginPageView(TemplateView):
    """Login page view"""
    template_name = 'login.html'

class RegisterPageView(TemplateView):
    """Register page view"""
    template_name = 'register.html'

def landing_page(request):
    """Landing page function-based view"""
    return render(request, 'landing.html')

def login_page(request):
    """Login page function-based view"""
    return render(request, 'login.html')

def register_page(request):
    """Register page function-based view"""
    return render(request, 'register.html')

def success_page(request):
    """Success page function-based view"""
    return render(request, 'success.html') 