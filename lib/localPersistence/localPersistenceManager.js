/* eslint-disable no-await-in-loop */
const util = require('util');
const { pipeline, Writable } = require('stream');
const level = require('level');
const subleveldown = require('subleveldown');
const memdown = require('memdown');
const encodedown = require('encoding-down');
const levelup = require('levelup');

/**
 * Promissify functions.
 */
const pipelineAsync = util.promisify(pipeline);
const levelAsync = util.promisify(level);

/**
 * Default path to local database storage.
 */
const DEFAULT_DATABASE_PATH = './dojot_persistence';

/**
 * default options for level creation.
 */
const DEFAULT_GET_OPTIONS = {
  valueEncoding: 'utf8',
  keyEncoding: 'utf8',
};

class LocalPersistenceManager {
  /**
   * Manages database creation, write, read, batchs and levels.
   *
   * @param {Logger} logger dojot logging module
   * @param {boolean} readInMemory define whether there will be an in-memory database cache
   * @param {string} databasePath define the path where the local database will be persisted
   */
  constructor(
    logger, readInMemory = true, databasePath = DEFAULT_DATABASE_PATH,
  ) {
    this.logger = logger;
    this.readInMemory = readInMemory;
    this.databasePath = databasePath;
  }

  /**
   * Initializes the databases and management level.
   *
   * @public
   */
  async init() {
    this.logger.info('Initializing database...');
    try {
      this.db = await levelAsync(this.databasePath);
      this.logger.info('Database initialized successfully');

      this.logger.debug('Initializing level manager...');
      this.managementLevel = subleveldown(
        this.db, 'managementLevel', { keyEncoding: 'utf8', valueEncoding: 'json' },
      );
      this.logger.debug('Level manager initialized');

      if (this.readInMemory) {
        await this.copyLevelsToMemory();
      }
    } catch (error) {
      this.logger.debug('Database initialize error');
      this.logger.error(error.message);
      throw error;
    }
  }

  /**
   * Copy the data of a level to another using NodeStreams
   *
   * @param {LevelUp} originLevel level that will be copied
   * @param {LevelUp} targetLevel level that will be the copy
   *
   * @public
   */
  static async copyLevel(originLevel, targetLevel) {
    const originLevelReadableStream = originLevel.createKeyStream();
    const targetLevelWritableStream = Writable({
      async write(
        key, _encoding, cb,
      ) {
        const value = await originLevel.get(key.toString());
        targetLevel.put(key.toString(), value);
        cb();
      },
    });

    try {
      await pipelineAsync(originLevelReadableStream,
        targetLevelWritableStream);
    } catch (error) {
      this.logger.debug('It was not possible to write the level data.');
      this.logger.debug(error);
    }
  }

  /**
   * Copy levels from disk to memory using a Node Streams at the management level.
   *
   * @private
   */
  async copyLevelsToMemory() {
    this.logger.debug('Initializing database clone in memory...');
    const tmpMemoryLevels = new Map();
    const tmpManagementLevel = this.managementLevel;
    const tmpDB = this.db;
    const tmpLogger = this.logger;

    const managementLevelReadableStream = tmpManagementLevel.createKeyStream();
    const managementLevelWritableStream = Writable({
      async write(
        key, encoding, cb,
      ) {
        const sublevelOptions = await tmpManagementLevel.get(key);
        tmpLogger.debug(`Cloning ${key.toString()} level in memory...`);
        const sublevel = subleveldown(
          tmpDB, key.toString(), sublevelOptions,
        );
        const memoryLevel = levelup(encodedown(memdown(), sublevelOptions));
        tmpMemoryLevels.set(key.toString(), memoryLevel);
        await LocalPersistenceManager.copyLevel(sublevel, memoryLevel);
        cb();
      },
    });

    try {
      await pipelineAsync(managementLevelReadableStream,
        managementLevelWritableStream);
    } catch (error) {
      this.logger.info(error);
    }

    this.memoryLevels = tmpMemoryLevels;
  }

  /**
   * Initialize or load the disk level and the level copied into memory.
   *
   * @param {string} sublevel the level key
   * @param {options} options the sublevel options. Just when initializing a new level.
   * @returns an array with two copies of the same level, one on disk and one in memory.
   *
   * @public
   */
  async initializeLevel(sublevel, options = DEFAULT_GET_OPTIONS) {
    if (sublevel === 'managementLevel') {
      throw new Error('Reserved level');
    }

    try {
      const tmpOptions = await this.managementLevel.get(sublevel);
      let memorySubLevel = null;
      if (this.readInMemory) {
        memorySubLevel = this.memoryLevels.get(sublevel);
      }
      const diskSubLevel = subleveldown(
        this.db, sublevel, tmpOptions,
      );

      return [diskSubLevel, memorySubLevel];
    } catch (error) {
      if (!options) {
        throw new Error(error.message);
      }
      const diskSublevel = subleveldown(
        this.db, sublevel, options,
      );
      await this.managementLevel.put(sublevel, options);
      let memorySubLevel = null;
      if (this.readInMemory) {
        memorySubLevel = levelup(encodedown(memdown(), options));
        this.memoryLevels.set(sublevel, memorySubLevel);
      }

      return [diskSublevel, memorySubLevel];
    }
  }


  /**
   * Initialize or load the disk level.
   *
   * @param {string} sublevel the level key
   * @param {options} options the sublevel options. Just when initializing a new level.
   * @returns an disk level
   *
   * @public
   */
  async initializeDiskLevel(sublevel, options = DEFAULT_GET_OPTIONS) {
    if (sublevel === 'managementLevel') {
      throw new Error('Reserved level');
    }

    try {
      const tmpOptions = await this.managementLevel.get(sublevel);
      const diskSubLevel = subleveldown(
        this.db, sublevel, tmpOptions,
      );

      return diskSubLevel;
    } catch (error) {
      if (!options) {
        throw new Error(error.message);
      }
      const diskSublevel = subleveldown(
        this.db, sublevel, options,
      );
      await this.managementLevel.put(sublevel, options);
      return diskSublevel;
    }
  }

  /**
   * Retrieves a disk level that has already been initialized.
   *
   * @param {string} sublevel the level key
   *
   * @returns an disk level
   *
   * @public
   */
  async getDiskLevel(sublevel) {
    if (sublevel === 'managementLevel') {
      throw new Error('Reserved level');
    }

    try {
      const tmpOptions = await this.managementLevel.get(sublevel);
      const diskSubLevel = subleveldown(
        this.db, sublevel, tmpOptions,
      );

      return diskSubLevel;
    } catch (error) {
      throw new Error('Level not found');
    }
  }

  /**
   * Retrieves a memory level that has already been initialized.
   *
   * @param {string} sublevel the level key
   *
   * @returns an memory level
   *
   * @public
   */
  async getMemoryLevel(sublevel) {
    if (!this.readInMemory) throw new Error('Read in memory disabled');
    const memorySublevel = this.memoryLevels.get(sublevel);
    if (!memorySublevel) throw new Error('Level not found');
    return memorySublevel;
  }

  /**
   * Executes a set of batch operations for several sublevels
   *
   * @param {*} operationsForLevel Map {
   *  key, //the level name
   *  value: Object {
   *    config, // the level configuration layout
   *    operations, // An array with all the desired operation
   *  }
   *
   * @public
   *
  */
  async executeBatchForLevels(operationsForLevel) {
    this.logger.debug('Preparing to execute the batch..');
    this.logger.debug(operationsForLevel);

    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of operationsForLevel) {
      const levelOperations = value;
      try {
        const [diskSublevel, memorySubLevel] = await this
          .initializeLevel(levelOperations.config.name, levelOperations.config.options);
        this.logger.debug(`Running batch for level "${key}"...`);
        await diskSublevel.batch(levelOperations.operations);
        if (this.readInMemory) {
          await memorySubLevel.batch(levelOperations.operations);
        }
      } catch (error) {
        this.logger.debug('It was not possible to execute the operations. ');
        this.logger.error(error.message);
        throw error;
      }
    }
  }

  /**
   * Inserts an entry into a level. Ensures consistency if there is an in-memory copy.
   *
   * @param {*} sublevel the level name (level key)
   * @param {*} key the data key
   * @param {*} value the data
   *
   * @public
   */
  async put(
    sublevel, key, value,
  ) {
    const [sublevelInDisk, sublevelInMemory] = await this.initializeLevel(sublevel);
    await sublevelInDisk.put(key, value);

    if (this.readInMemory) {
      try {
        await sublevelInMemory.put(key, value);
      } catch (error) {
        await sublevelInDisk.del(key);
        throw error;
      }
    }
  }

  /**
   * Removes an entry from a level. Ensures consistency if there is an in-memory copy.
   *
   * @param {*} sublevel the level name (level key)
   * @param {*} key the data key
   *
   * @returns the removed value
   *
   * @public
   */
  async del(sublevel, key) {
    const [sublevelInDisk, sublevelInMemory] = await this.initializeLevel(sublevel);
    const tmpValue = await sublevelInDisk.get(key);
    await sublevelInDisk.del(key);

    if (this.readInMemory) {
      try {
        await sublevelInMemory.del(key);
      } catch (error) {
        await sublevelInDisk.put(key, tmpValue);
        throw error;
      }
    }

    return tmpValue;
  }

  /**
   * Retrieves an one-level value from disk
   *
   * @param {*} sublevel the level name (level key)
   * @param {*} key the data key
   *
   * @returns the found value
   *
   * @public
   */
  async getInDisk(sublevel, key) {
    const sublevelInDisk = await this.initializeDiskLevel(sublevel);
    const value = await sublevelInDisk.get(key);
    return value;
  }

  /**
   * Retrieves an one-level value from memory
   *
   * @param {*} sublevel the level name (level key)
   * @param {*} key the data key
   *
   * @returns the found value
   *
   * @public
   */
  async getInMemory(sublevel, key) {
    if (!this.readInMemory) throw new Error('Read in memory disabled');
    const memorySublevel = await this.getMemoryLevel(sublevel);
    const value = await memorySublevel.get(key);
    return value;
  }

  /**
   * Retrieves an one-level value from memory if there is a copy of the database in memory,
   * otherwise, retrieves from disk. This method returns a promisse with the retrieved value.
   *
   * @param {*} sublevel the level name (level key)
   * @param {*} key the data key
   *
   * @returns the found value
   *
   * @public
   */
  async get(sublevel, key) {
    return this.readInMemory ? this.getInMemory(sublevel, key) : this.getInDisk(sublevel, key);
  }

  /**
   * Retrieves an one level key stream from memory.
   *
   * @param {*} sublevel the level name (level key)
   *
   * @returns the key stream
   *
   * @public
   */
  async createKeyStreamInMemory(sublevel) {
    if (!this.readInMemory) throw new Error('Read in memory disabled');
    const memorySublevel = await this.getMemoryLevel(sublevel);
    return memorySublevel.createKeyStream();
  }

  /**
   * Retrieves a value stream from memory.
   *
   * @param {*} sublevel the level name (level key)
   *
   * @returns the value stream
   *
   * @public
   */
  async createValueStreamInMemory(sublevel) {
    if (!this.readInMemory) throw new Error('Read in memory disabled');
    const memorySublevel = await this.getMemoryLevel(sublevel);
    return memorySublevel.createValueStream();
  }

  /**
   * Retrieves an entry stream from memory.
   *
   * @param {*} sublevel the level name (level key)
   *
   * @returns the entry stream
   *
   * @public
   */
  async createStreamInMemory(sublevel) {
    const memorySublevel = await this.getMemoryLevel(sublevel);
    return memorySublevel.createReadStream();
  }

  /**
   * Retrieves a key stream from memory.
   *
   * @param {*} sublevel the level name (level key)
   *
   * @returns the key stream
   *
   * @public
   */
  async createKeyStreamInDisk(sublevel) {
    const memorySublevel = await this.initializeDiskLevel(sublevel);
    return memorySublevel.createKeyStream();
  }

  /**
   * Retrieves a value stream from memory.
   *
   * @param {*} sublevel the level name (level key)
   *
   * @returns the value stream
   *
   * @public
   */
  async createValueStreamInDisk(sublevel) {
    const memorySublevel = await this.initializeDiskLevel(sublevel);
    return memorySublevel.createValueStream();
  }

  /**
   * Retrieves an entry stream from disk.
   *
   * @param {*} sublevel the level name (level key)
   *
   * @returns the entry stream
   *
   * @public
   */
  async createStreamInDisk(sublevel) {
    const memorySublevel = await this.initializeDiskLevel(sublevel);
    return memorySublevel.createReadStream();
  }

  /**
   * Retrieves a key stream from memory if there is a copy of the database in memory,
   * otherwise, retrieves from disk.
   *
   * @param {*} sublevel the level name (level key)
   *
   * @returns the key stream
   *
   * @public
   */
  async createKeyStream(sublevel) {
    return this.readInMemory ? this.createKeyStreamInMemory(sublevel)
      : this.createKeyStreamInDisk(sublevel);
  }

  /**
   * Retrieves a value stream from memory if there is a copy of the database in memory,
   * otherwise, retrieves from disk.
   *
   * @param {*} sublevel the level name (level key)
   *
   * @returns the value stream
   *
   * @public
   */
  async createValueStream(sublevel) {
    return this.readInMemory ? this.createValueStreamInMemory(sublevel)
      : this.createValueStreamInDisk(sublevel);
  }

  /**
   * Retrieves an entry stream from memory if there is a copy of the database in memory,
   * otherwise, retrieves from disk.
   *
   * @param {*} sublevel the level name (level key)
   *
   * @returns the entry stream
   *
   * @public
   */
  async createStream(sublevel) {
    return this.readInMemory ? this.createStreamInMemory(sublevel)
      : this.createStreamInDisk(sublevel);
  }

  /**
   * Delete all entries from a level
   *
   * @param {*} sublevelName the level name (level key)
   *
   * @public
   */
  async clear(sublevelName) {
    let sublevelOptions;
    try {
      sublevelOptions = await this.managementLevel.get(sublevelName);
    } catch (error) {
      this.logger.debug('The level not exists');
    }

    if (sublevelOptions) {
      const [sublevelDisk, sublevelMemory] = await this
        .initializeLevel(sublevelName, sublevelOptions);
      await sublevelDisk.clear();
      if (this.readInMemory) {
        await sublevelMemory.clear();
      }
    }
  }

  /**
   * Delete all entries.
   *
   * @public
   */
  async clearAll() {
    await this.db.clear();
    if (this.readInMemory) {
      this.memoryLevels.clear();
    }
  }

  /**
   * Close the stream with the database.
   *
   * @public
   */
  async close() {
    await this.db.close();
    if (this.readInMemory) {
      this.memoryLevels.clear();
      this.memoryLevels = null;
    }
  }
}

module.exports = LocalPersistenceManager;
