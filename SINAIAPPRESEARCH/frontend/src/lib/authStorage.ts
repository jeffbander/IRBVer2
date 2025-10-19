const TOKEN_KEY = 'research-platform.token';

export const saveToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const loadToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};
