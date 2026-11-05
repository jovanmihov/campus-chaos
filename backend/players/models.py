import secrets
import string

from django.db import IntegrityError, models, transaction

CODE_LENGTH = 6
MAX_CODE_ATTEMPTS = 10


def generate_code() -> str:
    return ''.join(secrets.choice(string.ascii_uppercase) for _ in range(CODE_LENGTH))


class Player(models.Model):

    code = models.CharField(max_length=CODE_LENGTH, primary_key=True)
    save_data = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.code

    @classmethod
    def create_with_new_code(cls) -> 'Player':
        for _ in range(MAX_CODE_ATTEMPTS):
            try:
                with transaction.atomic():
                    return cls.objects.create(code=generate_code())
            except IntegrityError:
                continue  # Code already taken, so draw another one
        raise RuntimeError('Could not find a free player code')
