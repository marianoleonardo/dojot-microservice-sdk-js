const { default: axios } = require('axios');

/**
 * This module allows for a standardized way to execute
 * an http request applying some best practices.
 */
module.exports = class DojotClientHttp {
  /**
   *
   * @param {axios.AxiosRequestConfig} defaultClientOptions The axios request config
   * @param {dojot.Logger} logger The Dojot logger
   * @param {number} defaultRetryDelay Default retry delay for failed requests
   * @param {number} defaultMaxNumberAttempts Default maximum number of attempts for failed requests
   */
  constructor({
    defaultClientOptions, logger, defaultRetryDelay = 5000, defaultMaxNumberAttempts = 3,
  }) {
    this.axios = axios.create(defaultClientOptions);
    this.defaultRetryDelay = defaultRetryDelay;
    this.defaultMaxNumberAttempts = defaultMaxNumberAttempts;
    this.logger = logger;
  }

  /**
   * Creates http request promise
   *
   * @param {axios.AxiosRequestConfig} options The axios request config
   * @param {number} retryDelay The retry delay for this request if it fails
   * @param {number} maxNumberAttempts maximum number of attempts for this request if it fails.
   * note: If the maximum value of the Number of Retries is 0, there will be no retry limit.
   *
   * @returns {Promise<AxiosResponse>} a promise of http response
   *
   * @public
   */
  request(
    options, retryDelay, maxNumberAttempts,
  ) {
    const outerThis = this;
    return new Promise((resolve, reject) => {
      outerThis.doRequest(
        options, resolve, reject, {
          attempts: 0,
          retryDelay: retryDelay || outerThis.defaultRetryDelay,
          maxNumberAttempts: maxNumberAttempts || maxNumberAttempts === 0
            ? maxNumberAttempts : this.defaultMaxNumberAttempts,
        },
      );
    });
  }

  /**
   * Retries a request.
   *
   * @param {Error} requestError The error of the previous request.
   * @param {*} options The options of the previous request.
   * @param {*} resolve The promise resolve method of the previous request.
   * @param {*} reject The promise reject method of the previous request.
   * @param {*} previousConfigAndStatus The config of the previous request and retry status.
   *
   * @private
   */
  retry(
    requestError, options, resolve, reject, previousConfigAndStatus,
  ) {
    const outerThis = this;
    const { attempts, retryDelay, maxNumberAttempts } = previousConfigAndStatus;
    if (maxNumberAttempts > 0 && attempts >= maxNumberAttempts) {
      reject(new Error('Number of attempts exceeded.'));
    } else {
      this.logger.error(requestError.message);
      const newRetryDelay = (requestError.response && requestError.response.status === 429)
        ? retryDelay * 2 : retryDelay;
      this.logger.debug(`Retrying in ${retryDelay}`);

      setTimeout(() => {
        outerThis.logger.debug(`Retrying response - attempt:${attempts + 1}.`);
        outerThis.doRequest(
          options, resolve, reject, {
            attempts: attempts + 1, retryDelay: newRetryDelay, maxNumberAttempts,
          },
        );
      }, newRetryDelay);
    }
  }

  /**
   * Executes the promised request.
   *
   * @param {*} options The options of the promised request.
   * @param {*} resolve The promise resolve method of the promised request.
   * @param {*} reject The promise reject method of the promised request.
   * @param {*} configRetryRequest The settings of the retry request if it fails
   *
   * @private
   */
  doRequest(
    options, resolve, reject, configRetryRequest,
  ) {
    this.axios(options).then((response) => {
      resolve(response);
    }).catch((requestError) => {
      this.retry(
        requestError, options, resolve, reject, configRetryRequest,
      );
    });
  }
};