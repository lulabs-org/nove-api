import { Response } from 'express';
import { AuthCookieHelper } from './auth-cookie.helper';

describe('AuthCookieHelper', () => {
  let res: { cookie: jest.Mock; clearCookie: jest.Mock };

  beforeEach(() => {
    res = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
  });

  describe('setRefreshToken', () => {
    it('sets refreshToken cookie with httpOnly and calculated maxAge', () => {
      AuthCookieHelper.setRefreshToken(
        res as unknown as Response,
        'rt-token',
        3600,
      );

      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'rt-token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        maxAge: 3600000,
      });
    });

    it('handles 0 or missing maxAge gracefully', () => {
      AuthCookieHelper.setRefreshToken(res as unknown as Response, 'rt-token');

      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'rt-token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        maxAge: 0,
      });
    });
  });

  describe('clearRefreshToken', () => {
    it('clears refreshToken cookie with matching base options', () => {
      AuthCookieHelper.clearRefreshToken(res as unknown as Response);

      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
      });
    });
  });
});
