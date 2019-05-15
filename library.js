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

	/**
	 * REMEMBER
	 *   Never save your OAuth Key/Secret or OAuth2 ID/Secret pair in code! It could be published and leaked accidentally.
	 *   Save it into your config.json file instead:
	 *
	 *   {
	 *     ...
	 *     "oauth": {
	 *       "id": "someoauthid",
	 *       "secret": "youroauthsecret"
	 *     }
	 *     ...
	 *   }
	 *
	 *   ... or use environment variables instead:
	 *
	//  *   `OAUTH__ID=someoauthid OAUTH__SECRET=youroauthsecret node app.js`
	 */

	const constants = Object.freeze({
		// type: '',	// Either 'oauth' or 'oauth2'
		name: 'azuread',	// Something unique to your OAuth provider in lowercase, like "github", or "nodebb"
		scope: config.creds.scope,
		// oauth: {
		// 	requestTokenURL: '',
		// 	accessTokenURL: '',
		// 	userAuthorizationURL: '',
		// 	consumerKey: nconf.get('oauth:key'),	// don't change this line
		// 	consumerSecret: nconf.get('oauth:secret'),	// don't change this line
		// },
		// oauth2: {
		// 	authorizationURL: '',
		// 	tokenURL: '',
		// 	clientID: nconf.get('oauth:id'),	// don't change this line
		// 	clientSecret: nconf.get('oauth:secret'),	// don't change this line
		// },
		// userRoute: '',	// This is the address to your app's "user profile" API endpoint (expects JSON)
	});

	const OAuth = {};
	let configOk = false;
	let passportOAuth;
	// let opts;

	if (!constants.name) {
		winston.error('[sso-oauth] Please specify a name for your OAuth provider (library.js:32)');

	// } else if (!constants.type || (constants.type !== 'oauth' && constants.type !== 'oauth2')) {
	// 	winston.error('[sso-oauth] Please specify an OAuth strategy to utilise (library.js:31)');
	// } else if (!constants.userRoute) {
	// 	winston.error('[sso-oauth] User Route required (library.js:31)');
	// }
	} else {
		configOk = true;
	}

	OAuth.getStrategy = function (strategies, callback) {
		if (configOk) {
			passportOAuth = require('passport-azure-ad').OIDCStrategy;

			//  if (constants.type === 'oauth') {
			// 	// OAuth options
			// 	opts = constants.oauth;
			// 	opts.callbackURL = nconf.get('url') + '/auth/' + constants.name + '/callback';

			// 	passportOAuth.Strategy.prototype.userProfile = function (token, secret, params, done) {
			// 		this._oauth.get(constants.userRoute, token, secret, function (err, body/* , res */) {
			// 			if (err) {
			// 				return done(err);
			// 			}

			// 			try {
			// 				var json = JSON.parse(body);
			// 				OAuth.parseUserReturn(json, function (err, profile) {
			// 					if (err) return done(err);
			// 					profile.provider = constants.name;

			// 					done(null, profile);
			// 				});
			// 			} catch (e) {
			// 				done(e);
			// 			}
			// 		});
			// 	};
			// } else if (constants.type === 'oauth2')
			// {
			// OAuth 2 options
			// opts = constants.oauth2;
			// opts.callbackURL = nconf.get('url') + '/auth/' + constants.name + '/callback';

			// passportOAuth.Strategy.prototype.userProfile = function (accessToken, done) {
			// 	this._oauth2.get(constants.userRoute, accessToken, function (err, body/* , res */) {
			// 		if (err) {
			// 			return done(err);
			// 		}

			// 		try {
			// 			var json = JSON.parse(body);
			// 			OAuth.parseUserReturn(json, function (err, profile) {
			// 				if (err) return done(err);
			// 				profile.provider = constants.name;

			// 				done(null, profile);
			// 			});
			// 		} catch (e) {
			// 			done(e);
			// 		}
			// 	});
			// };
			// }

			// opts.passReqToCallback = true;

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
				icon: 'fa-microsoft',
				scope: (constants.scope || '').split(','),
			});

			callback(null, strategies);
		} else {
			callback(new Error('OAuth Configuration is invalid'));
		}
	};

	// OAuth.parseUserReturn = function (data, callback) {
	// 	// Alter this section to include whatever data is necessary
	// 	// NodeBB *requires* the following: id, displayName, emails.
	// 	// Everything else is optional.

	// 	// Find out what is available by uncommenting this line:
	// 	// console.log(data);

	// 	var profile = {};
	// 	profile.id = data.id;
	// 	profile.displayName = data.name;
	// 	profile.emails = [{ value: data.email }];

	// 	// Do you want to automatically make somebody an admin? This line might help you do that...
	// 	// profile.isAdmin = data.isAdmin ? true : false;

	// 	// Delete or comment out the next TWO (2) lines when you are ready to proceed
	// 	process.stdout.write('===\nAt this point, you\'ll need to customise the above section to id, displayName, and emails into the "profile" object.\n===');
	// 	return callback(new Error('Congrats! So far so good -- please see server log for details'));

	// 	// eslint-disable-next-line
	// 	callback(null, profile);
	// };

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
