const jwt = require('jsonwebtoken');
const { Unauthorized } = require('../backing/errorTemplate');

/**
 * Format certificate in x5c format
 *
 * @param {string} base64PublicKey Public key in base64
 *
 * @returns rsa cerficate
 */
function formatCertificate(base64PublicKey) {
  let certificate = '-----BEGIN CERTIFICATE-----\n';
  const chucks = base64PublicKey.match(/.{1,64}/g);
  certificate += chucks.join('\n');
  certificate += '\n-----END CERTIFICATE-----';

  return certificate;
}

/**
 * Keycloak Middleware factory - Creates a middleware for verify the access_token of the requests
 *
 * @param {Object[]} tenants The list of known tenants with their certificates
 * @param {*} logger Dojot logger
 * @param {*} path The routes that will be affected
 *
 * @returns a express middleware
 */
function createKeycloakAuthInterceptor(
  tenants, logger, path = '/',
) {
  return {
    path,
    name: 'keycloak-auth-interceptor',
    middleware: (
      req, res, next,
    ) => {
      let prefix;
      let tokenRaw;
      try {
        [prefix, tokenRaw] = req.headers.authorization.split(' ');
      } catch (error) {
        throw Unauthorized('Unauthorized access', 'Invalid access_token');
      }

      if (prefix === 'Bearer') {
        let tenant;
        try {
          logger.info('Decoding access_token.');
          const tokenDecoded = jwt.decode(tokenRaw);
          logger.debug('Getting tenant.');
          const requestTenant = tokenDecoded.iss.split('/').pop();
          tenant = tenants.find((item) => item.id === requestTenant);
        } catch (decodedError) {
          throw Unauthorized('Unauthorized access', 'Invalid access_token');
        }

        if (tenant) {
          logger.debug('Verify access_token.');
          jwt.verify(
            tokenRaw,
            formatCertificate(tenant.sigKey.certificate),
            { algorithms: [tenant.sigKey.algorithm] },
            (verifyTokenError) => {
              if (verifyTokenError) {
                logger.debug(verifyTokenError.message);
                throw Unauthorized('Unauthorized access', verifyTokenError.message);
              }
              logger.debug('Successfully verified.');
              req.tenant = tenant;
              next();
            },
          );
        } else {
          logger.debug('Tenant not found or invalid.');
          throw Unauthorized('Unauthorized access', 'Tenant not found or invalid');
        }
      } else {
        logger.debug('Access token is not found');
        throw Unauthorized('Unauthorized access', 'Access token is not found');
      }
    },
  };
}

module.exports = createKeycloakAuthInterceptor;
