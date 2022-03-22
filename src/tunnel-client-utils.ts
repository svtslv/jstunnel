// noinspection DuplicatedCode

import * as util from 'util';

export const createLogger = (section) => {
  const colors = {
    red: (text) => ['\x1b[31m', text, '\x1b[0m'],
    green: (text) => ['\x1b[32m', text, '\x1b[0m'],
    blue: (text) => ['\x1b[34m', text, '\x1b[0m'],
  };
  const logger = {
    ...console,
    // eslint-disable-next-line no-console
    inspect: (obj) => console.log(util.inspect(obj, { showHidden: false, depth: null, colors: true })),
  };
  // eslint-disable-next-line no-console
  logger.info = (...args) => console.info(...colors.green('INFO:'), ...args);
  logger.error = (...args) => console.error(...colors.red('ERROR:'), ...args);
  logger.debug = (...args) => {
    if (['*', 'jstunnel', section].includes(process.env.DEBUG)) {
      // eslint-disable-next-line no-console
      console.debug(new Date(), ...colors.blue(section), ...args);
    }
  };
  return logger;
};

export const deleteUndefined = (obj) => {
  Object.keys(obj).forEach((key) => (obj[key] === undefined ? delete obj[key] : {}));
};
