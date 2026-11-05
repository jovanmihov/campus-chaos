from django.core.cache import cache
from ninja import NinjaAPI
from ninja.errors import HttpError
from ninja.security import HttpBearer
from ninja.throttling import AnonRateThrottle

from .models import Player
from .schemas import PlayerOut, SaveData

MAX_WRONG_CODES = 20
WRONG_CODE_WINDOW_SECONDS = 15 * 60


class PlayerCodeAuth(HttpBearer):

    def authenticate(self, request, token):
        key = f"wrong-codes:{request.META['REMOTE_ADDR']}"
        wrong_codes = cache.get(key, 0)
        if wrong_codes >= MAX_WRONG_CODES:
            raise HttpError(429, 'Too many wrong codes. Try again later.')

        player = Player.objects.filter(code=token).first()
        if player is None:
            cache.set(key, wrong_codes + 1, WRONG_CODE_WINDOW_SECONDS)
        return player


api = NinjaAPI(title='Campus Chaos API', auth=PlayerCodeAuth())


@api.post(
    '/players',
    auth=None,
    response={201: PlayerOut},
    throttle=[AnonRateThrottle('10/m')],
)
def create_player(request):
    return 201, Player.create_with_new_code()


@api.get('/save', response=dict)
def get_save(request):
    """Returns the save as stored, so older versions can still be read and upgraded."""
    save_data = request.auth.save_data
    if save_data is None:
        raise HttpError(404, 'No save yet')
    return save_data


@api.put('/save', response={204: None})
def put_save(request, save: SaveData):
    player = request.auth
    player.save_data = save.dict()
    player.save(update_fields=['save_data', 'updated_at'])
    return 204, None
