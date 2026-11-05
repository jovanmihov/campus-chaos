import json
import re
from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase

from .api import MAX_WRONG_CODES
from .models import Player

VALID_SAVE = {
    'version': 1,
    'scene': 'CampusScene',
    'position': {'x': 65, 'y': 38},
    'stats': {'gpa': 7.25, 'energy': 80, 'dignity': 55.5, 'sanity': 100},
    'flags': {'metDean': True},
}


class ApiTestCase(TestCase):
    def setUp(self):
        cache.clear()  # Throttle and wrong-code counters live in the cache

    def get_save(self, code):
        return self.client.get('/api/save', headers={'Authorization': f'Bearer {code}'})

    def put_save(self, code, save):
        return self.client.put(
            '/api/save',
            data=json.dumps(save),
            content_type='application/json',
            headers={'Authorization': f'Bearer {code}'},
        )


class CreatePlayerTests(ApiTestCase):
    def test_returns_six_uppercase_letters(self):
        response = self.client.post('/api/players')

        self.assertEqual(response.status_code, 201)
        code = response.json()['code']
        self.assertRegex(code, re.compile(r'^[A-Z]{6}$'))
        self.assertTrue(Player.objects.filter(code=code).exists())

    def test_draws_again_when_code_is_taken(self):
        Player.objects.create(code='AAAAAA')

        with patch('players.models.generate_code', side_effect=['AAAAAA', 'AAAAAA', 'BBBBBB']):
            response = self.client.post('/api/players')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['code'], 'BBBBBB')

    def test_is_rate_limited(self):
        statuses = [self.client.post('/api/players').status_code for _ in range(11)]

        self.assertEqual(statuses, [201] * 10 + [429])

    def test_rate_limit_ignores_spoofed_forwarded_header(self):
        statuses = [
            self.client.post(
                '/api/players', headers={'X-Forwarded-For': f'10.0.0.{i}'}
            ).status_code
            for i in range(11)
        ]

        self.assertEqual(statuses[-1], 429)


class SaveTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.player = Player.objects.create(code='ABCDEF')

    def test_round_trip(self):
        self.assertEqual(self.put_save('ABCDEF', VALID_SAVE).status_code, 204)

        response = self.get_save('ABCDEF')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), VALID_SAVE)

    def test_put_replaces_previous_save(self):
        self.put_save('ABCDEF', VALID_SAVE)
        self.put_save('ABCDEF', {**VALID_SAVE, 'position': {'x': 1, 'y': 2}})

        self.assertEqual(self.get_save('ABCDEF').json()['position'], {'x': 1, 'y': 2})

    def test_no_save_yet_is_404(self):
        self.assertEqual(self.get_save('ABCDEF').status_code, 404)

    def test_players_only_see_their_own_save(self):
        Player.objects.create(code='ZZZZZZ')
        self.put_save('ABCDEF', VALID_SAVE)

        self.assertEqual(self.get_save('ZZZZZZ').status_code, 404)

    def test_older_save_shape_can_still_be_read(self):
        old_save = {'version': 0, 'stats': {'gpa': 5}}
        Player.objects.filter(code='ABCDEF').update(save_data=old_save)

        response = self.get_save('ABCDEF')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), old_save)

    def test_rejects_invalid_saves(self):
        stats = VALID_SAVE['stats']
        invalid_saves = {
            'stat above max': {**VALID_SAVE, 'stats': {**stats, 'gpa': 11}},
            'stat below zero': {**VALID_SAVE, 'stats': {**stats, 'energy': -1}},
            'unknown stat': {**VALID_SAVE, 'stats': {**stats, 'charisma': 5}},
            'negative tile': {**VALID_SAVE, 'position': {'x': -1, 'y': 0}},
            'empty scene': {**VALID_SAVE, 'scene': ''},
        }

        for name, save in invalid_saves.items():
            with self.subTest(name):
                self.assertEqual(self.put_save('ABCDEF', save).status_code, 422)

        self.player.refresh_from_db()
        self.assertIsNone(self.player.save_data)


class AuthTests(ApiTestCase):
    def test_missing_code_is_401(self):
        self.assertEqual(self.client.get('/api/save').status_code, 401)

    def test_wrong_code_is_401(self):
        self.assertEqual(self.get_save('NOPEXX').status_code, 401)

    def test_too_many_wrong_codes_locks_out_even_a_right_code(self):
        Player.objects.create(code='ABCDEF')

        for _ in range(MAX_WRONG_CODES):
            self.assertEqual(self.get_save('NOPEXX').status_code, 401)

        self.assertEqual(self.get_save('NOPEXX').status_code, 429)
        self.assertEqual(self.get_save('ABCDEF').status_code, 429)

    def test_right_codes_do_not_count_as_wrong(self):
        Player.objects.create(code='ABCDEF')

        for _ in range(MAX_WRONG_CODES + 1):
            self.assertEqual(self.get_save('ABCDEF').status_code, 404)


class CorsTests(ApiTestCase):
    def test_allows_the_vite_dev_server_on_any_port(self):
        for origin in ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173']:
            with self.subTest(origin):
                response = self.client.post('/api/players', headers={'Origin': origin})

                self.assertEqual(response.headers['Access-Control-Allow-Origin'], origin)

    def test_blocks_other_origins(self):
        response = self.client.post('/api/players', headers={'Origin': 'http://evil.example'})

        self.assertNotIn('Access-Control-Allow-Origin', response.headers)
