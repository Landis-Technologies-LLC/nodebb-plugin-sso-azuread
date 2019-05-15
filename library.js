'use strict';

(function (module) {
	const User = require.main.require('./src/user');
	const Groups = require.main.require('./src/groups');
	const db = require.main.require('./src/database');
	const authenticationController = require.main.require('./src/controllers/authentication');

	const async = require('async');

	const passport = module.parent.require('passport');
	const nconf = module.parent.require('nconf');
	const winston = module.parent.require('winston');
	var config = require('./config');


	const constants = Object.freeze({

		name: 'azuread',	// Something unique to your OAuth provider in lowercase, like "github", or "nodebb"
		scope: config.creds.scope,
	});

	const OAuth = {};
	let passportOAuth;

	OAuth.getStrategy = function (strategies, callback) {
		passportOAuth = require('passport-azure-ad').OIDCStrategy;

		passport.use(constants.name, new passportOAuth({
			identityMetadata: config.creds.identityMetadata,
			clientID: config.creds.clientID,
			responseType: config.creds.responseType,
			responseMode: config.creds.responseMode,
			redirectUrl: nconf.get('url') + '/auth/' + constants.name + '/callback',
			allowHttpForRedirectUrl: config.creds.allowHttpForRedirectUrl,
			clientSecret: config.creds.clientSecret,
			validateIssuer: config.creds.validateIssuer,
			isB2C: config.creds.isB2C,
			issuer: config.creds.issuer,
			passReqToCallback: true,
			scope: config.creds.scope,
			loggingLevel: config.creds.loggingLevel,
			nonceLifetime: config.creds.nonceLifetime,
			nonceMaxAmount: config.creds.nonceMaxAmount,
			useCookieInsteadOfSession: config.creds.useCookieInsteadOfSession,
			cookieEncryptionKeys: config.creds.cookieEncryptionKeys,
			clockSkew: config.creds.clockSkew,
		}, function (req, iss, sub, profile, done) {
			OAuth.login({
				oAuthid: profile.oid,
				handle: profile.displayName,
				email: profile._json.preferred_username,
				isAdmin: false,
			}, function (err, user) {
				if (err) {
					return done(err);
				}

				authenticationController.onSuccessfulLogin(req, user.uid);
				done(null, user);
			});
		}));

		strategies.push({
			name: constants.name,
			url: '/auth/' + constants.name,
			callbackURL: '/auth/' + constants.name + '/callback',
			icon: 'fa-windows',
			scope: constants.scope,
			callbackMethod: 'post',
			checkState: false,
		});

		callback(null, strategies);
	};

	OAuth.login = function (payload, callback) {
		OAuth.getUidByOAuthid(payload.oAuthid, function (err, uid) {
			if (err) {
				return callback(err);
			}

			if (uid !== null) {
				// Existing User
				callback(null, {
					uid: uid,
				});
			} else {
				// New User
				var success = function (uid) {
					// Save provider-specific information to the user
					User.setUserField(uid, constants.name + 'Id', payload.oAuthid);
					db.setObjectField(constants.name + 'Id:uid', payload.oAuthid, uid);

					if (payload.isAdmin) {
						Groups.join('administrators', uid, function (err) {
							callback(err, {
								uid: uid,
							});
						});
					} else {
						callback(null, {
							uid: uid,
						});
					}
				};

				User.getUidByEmail(payload.email, function (err, uid) {
					if (err) {
						return callback(err);
					}

					if (!uid) {
						User.create({
							username: payload.handle,
							email: payload.email,
						}, function (err, uid) {
							if (err) {
								return callback(err);
							}

							success(uid);
						});
					} else {
						success(uid); // Existing account -- merge
					}
				});
			}
		});
	};

	OAuth.getUidByOAuthid = function (oAuthid, callback) {
		db.getObjectField(constants.name + 'Id:uid', oAuthid, function (err, uid) {
			if (err) {
				return callback(err);
			}
			callback(null, uid);
		});
	};

	OAuth.deleteUserData = function (data, callback) {
		async.waterfall([
			async.apply(User.getUserField, data.uid, constants.name + 'Id'),
			function (oAuthIdToDelete, next) {
				db.deleteObjectField(constants.name + 'Id:uid', oAuthIdToDelete, next);
			},
		], function (err) {
			if (err) {
				winston.error('[sso-oauth] Could not remove OAuthId data for uid ' + data.uid + '. Error: ' + err);
				return callback(err);
			}

			callback(null, data);
		});
	};

	// If this filter is not there, the deleteUserData function will fail when getting the oauthId for deletion.
	OAuth.whitelistFields = function (params, callback) {
		params.whitelist.push(constants.name + 'Id');
		callback(null, params);
	};

	module.exports = OAuth;
}(module));
