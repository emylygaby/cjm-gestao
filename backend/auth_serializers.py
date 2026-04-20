from django.contrib.auth.models import User
from rest_framework import serializers
import re


class CurrentUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'first_name',
            'last_name',
            'email',
            'is_staff',
            'is_active',
        ]


class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'first_name',
            'last_name',
            'email',
            'is_staff',
            'is_active',
            'last_login',
            'date_joined',
        ]
        read_only_fields = ['last_login', 'date_joined']


class UserCreateUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=6)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'first_name',
            'last_name',
            'email',
            'password',
            'is_staff',
            'is_active',
        ]

    def validate_password(self, value):
        if not value and self.instance is None:
            raise serializers.ValidationError('Senha é obrigatória para criar usuário.')
        if value and len(value) < 6:
            raise serializers.ValidationError('A senha deve ter no mínimo 6 caracteres.')
        return value

    def validate_username(self, value):
        username = value.strip()

        if len(username) > 11:
            raise serializers.ValidationError('O usuário deve ter no máximo 11 caracteres.')

        if not re.fullmatch(r'[A-Za-z0-9]+', username):
            raise serializers.ValidationError(
                'O usuário deve conter apenas letras e números, sem caracteres especiais.'
            )

        return username

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

        instance.save()
        return instance
