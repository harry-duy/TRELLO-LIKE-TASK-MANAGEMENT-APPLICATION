// backend/src/config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/user.model');

const hasGoogleOAuthConfig =
  Boolean(process.env.GOOGLE_CLIENT_ID) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET);

if (hasGoogleOAuthConfig) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ email: profile.emails[0].value });
          if (user) {
            if (!user.avatar && profile.photos?.[0]?.value) {
              user.avatar = profile.photos[0].value;
              await user.save({ validateBeforeSave: false });
            }
            return done(null, user);
          }
          user = await User.create({
            name: profile.displayName,
            email: profile.emails[0].value,
            avatar: profile.photos?.[0]?.value || null,
            password: `oauth_google_${Math.random().toString(36).slice(-16)}_${Date.now()}`,
            isEmailVerified: true,
          });
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
} else {
  console.warn('[AUTH] Google OAuth disabled: missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET');
}

const hasFacebookOAuthConfig =
  Boolean(process.env.FACEBOOK_APP_ID) &&
  Boolean(process.env.FACEBOOK_APP_SECRET);

if (hasFacebookOAuthConfig) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: '/api/auth/facebook/callback',
        profileFields: ['id', 'displayName', 'photos', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email =
            profile.emails?.[0]?.value || `${profile.id}@facebook.local`;
          let user = await User.findOne({ email });
          if (user) {
            if (!user.avatar && profile.photos?.[0]?.value) {
              user.avatar = profile.photos[0].value;
              await user.save({ validateBeforeSave: false });
            }
            return done(null, user);
          }
          user = await User.create({
            name: profile.displayName,
            email,
            avatar: profile.photos?.[0]?.value || null,
            password: `oauth_fb_${Math.random().toString(36).slice(-16)}_${Date.now()}`,
            isEmailVerified: true,
          });
          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
} else {
  console.warn('[AUTH] Facebook OAuth disabled: missing FACEBOOK_APP_ID/FACEBOOK_APP_SECRET');
}

module.exports = passport;