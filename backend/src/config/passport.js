// backend/src/config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/user.model');

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
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('Không lấy được email từ Facebook'), null);
        }
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

module.exports = passport;