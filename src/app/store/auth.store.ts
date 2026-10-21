import { createStore, withProps, select } from '@ngneat/elf';
import { persistState } from '@ngneat/elf-persist-state';
import { localStorageStrategy } from '@ngneat/elf-persist-state';

interface AuthState {
  token: string | null;
  expiredAt: string | null;
  refreshToken: string | null;
  refreshTokenExpiredAt: string | null;
}

export const authStore = createStore(
  { name: 'retail-auth' },
  withProps<AuthState>({ token: null, expiredAt: null, refreshToken: null, refreshTokenExpiredAt: null })
);

export const persist = persistState(authStore, {
  key: 'retail-auth',
  storage: localStorageStrategy,
});

export const token$ = authStore.pipe(select((state) => state.token));

export function updateAuth(token: string | null, expiredAt: string | null, refreshToken: string | null, refreshTokenExpiredAt: string | null) {
  authStore.update((state) => ({
    ...state,
    token,
    expiredAt,
    refreshToken,
    refreshTokenExpiredAt
  }));
}

export function resetAuth() {
  authStore.update(state => ({
    ...state,
    token: null,
    expiredAt: null,
    refreshToken: null,
    refreshTokenExpiredAt: null,
  }));
}