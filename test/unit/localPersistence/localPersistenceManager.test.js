const LocalPersistenceManager = require('../../../lib/localPersistence/localPersistenceManager');

// mocks
const loggerMock = {
  // eslint-disable-next-line no-unused-vars
  info: (_text) => {},
  // eslint-disable-next-line no-unused-vars
  debug: (_text) => {},
};

describe('Local Persistence Manager', () => {
  let dojotDB;

  afterEach(async () => {
    if (dojotDB) {
      await dojotDB.clearAll();
      await dojotDB.close();
    }
  });

  it('Should construct the class without an in-memory clone, when readInMemory is set to false.', async () => {
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, false, 'dojot_persistence_test',
    );
    await dojotDB.init();
    /* matches */
    expect(dojotDB.memoryLevels).toBeUndefined();
  });

  it('Should initialize the disk level', async () => {
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, false, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Test */
    const diskSubLevel = await dojotDB.initializeDiskLevel('test_1', {
      keyEncoding: 'utf8',
      valueEncoding: 'utf8',
    });

    /* matches */
    expect(diskSubLevel).toBeDefined();
  });

  it('Should get the level of the disk, when the level has already been initialized', async () => {
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, false, 'dojot_persistence_test',
    );
    await dojotDB.init();
    await dojotDB.initializeDiskLevel('test_1', {
      keyEncoding: 'utf8',
      valueEncoding: 'utf8',
    });

    /* Test */
    const diskSubLevel = await dojotDB.getDiskLevel('test_1');

    /* matches */
    expect(diskSubLevel).toBeDefined();
  });

  it('Should throw an error, when the level has not been initialized', async () => {
    /* Init objects */
    let error;
    dojotDB = new LocalPersistenceManager(
      loggerMock, false, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Test */
    try {
      await dojotDB.getDiskLevel('test_1');
    } catch (e) {
      error = e;
    }

    /* matches */
    expect(error.message).toEqual('Level not found');
  });

  it('Should throw an error, when the level name parameter is "managementLevel"', async () => {
    /* Init objects */
    let error;
    dojotDB = new LocalPersistenceManager(
      loggerMock, false, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Test */
    try {
      await dojotDB.getDiskLevel('managementLevel');
    } catch (e) {
      error = e;
    }

    /* matches */
    expect(error.message).toEqual('Reserved level');
  });

  it('Should initialize only one disk level, when readInMemory is set to false.', async () => {
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, false, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Test */
    const [diskSubLevel, memorySubLevel] = await dojotDB.initializeLevel('test_1', {
      keyEncoding: 'utf8',
      valueEncoding: 'utf8',
    });

    /* matches */
    expect(diskSubLevel).toBeDefined();
    expect(memorySubLevel).toBeNull();
  });

  it('Should get the level from memory, when the level has already been initialized', async () => {
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, true, 'dojot_persistence_test',
    );
    await dojotDB.init();
    await dojotDB.initializeLevel('test_1', {
      keyEncoding: 'utf8',
      valueEncoding: 'utf8',
    });

    /* Test */
    const diskSubLevel = await dojotDB.getMemoryLevel('test_1');

    /* matches */
    expect(diskSubLevel).toBeDefined();
  });

  it('Should throw an error, when readInMemory is set to false ', async () => {
    /* Init objects */
    let error;
    dojotDB = new LocalPersistenceManager(
      loggerMock, false, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Test */
    try {
      await dojotDB.getMemoryLevel('test_1');
    } catch (e) {
      error = e;
    }

    /* matches */
    expect(error.message).toEqual('Read in memory disabled');
  });

  it('Should throw an error, when the level has not been initialized', async () => {
    /* Init objects */
    let error;
    dojotDB = new LocalPersistenceManager(
      loggerMock, true, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Test */
    try {
      await dojotDB.getMemoryLevel('test_1');
    } catch (e) {
      error = e;
    }

    /* matches */
    expect(error.message).toEqual('Level not found');
  });

  it('Should construct the class with an in-memory clone, when readInMemory is set to true.', async () => {
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, true, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* matches */
    expect(dojotDB.memoryLevels).toBeDefined();
  });

  it('Should initialize one disk level and one memory level, when readInMemory is set to true.', async () => {
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, true, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Test */
    const [diskSubLevel, memorySubLevel] = await dojotDB.initializeLevel('test_1', {
      keyEncoding: 'utf8',
      valueEncoding: 'utf8',
    });

    /* matches */
    expect(diskSubLevel).toBeTruthy();
    expect(memorySubLevel).toBeTruthy();
  });

  it('Should recover disk level and memory level already initialized', async () => {
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, true, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Prepare */
    await dojotDB.initializeLevel('test_1', {
      keyEncoding: 'utf8',
      valueEncoding: 'utf8',
    });

    /* Test */
    const [recycledDiskSubLevel, recycledMemorySubLevel] = await dojotDB.initializeLevel('test_1');

    /* matches */
    expect(recycledDiskSubLevel).toBeTruthy();
    expect(recycledMemorySubLevel).toBeTruthy();
  });

  it('Should throw an error, when the level name parameter is "managementLevel"', async () => {
    /* Init objects */
    let error;
    dojotDB = new LocalPersistenceManager(
      loggerMock, true, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Test */
    try {
      await dojotDB.initializeLevel('managementLevel', {
        keyEncoding: 'utf8',
        valueEncoding: 'utf8',
      });
    } catch (e) {
      error = e;
    }

    /* matches */
    expect(error.message).toEqual('Reserved level');
  });

  it('Should clone the database levels in memory', async () => {
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, false, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Prepare */
    // eslint-disable-next-line no-unused-vars
    await dojotDB.initializeDiskLevel('test_1', {
      keyEncoding: 'utf8',
      valueEncoding: 'utf8',
    });
    await dojotDB.initializeDiskLevel('test_2', {
      keyEncoding: 'utf8',
      valueEncoding: 'utf8',
    });
    await dojotDB.initializeDiskLevel('test_3', {
      keyEncoding: 'utf8',
      valueEncoding: 'utf8',
    });

    /* Test */
    await dojotDB.copyLevelsToMemory();

    /* Matches */
    expect(dojotDB.memoryLevels.get('test_1')).toBeDefined();
    expect(dojotDB.memoryLevels.get('test_2')).toBeDefined();
    expect(dojotDB.memoryLevels.get('test_3')).toBeDefined();
  });

  it('Should copy data from one level to another', async () => {
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, false, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Prepare */
    const originDiskSubLevel = await dojotDB.initializeDiskLevel('test_origin', {
      keyEncoding: 'utf8',
      valueEncoding: 'utf8',
    });
    originDiskSubLevel.put('test_key_1', 'test_value_1');
    originDiskSubLevel.put('test_key_2', 'test_value_2');
    originDiskSubLevel.put('test_key_3', 'test_value_3');
    const cloneDiskSubLevel = await dojotDB.initializeDiskLevel('test_clone', {
      keyEncoding: 'utf8',
      valueEncoding: 'utf8',
    });

    /* Test */
    await LocalPersistenceManager.copyLevel(originDiskSubLevel, cloneDiskSubLevel);

    /* Matches */
    expect(await cloneDiskSubLevel.get('test_key_1')).toEqual('test_value_1');
    expect(await cloneDiskSubLevel.get('test_key_2')).toEqual('test_value_2');
    expect(await cloneDiskSubLevel.get('test_key_3')).toEqual('test_value_3');
  });

  it('Should store the data to disk and then retrieve the same data, when readInMemory is set to false.', async () => {
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, false, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Test */
    await dojotDB.put(
      'test_level', 'test_key', 'test_value',
    );

    /* Matches */
    expect(await dojotDB.getInDisk('test_level', 'test_key')).toEqual('test_value');
    expect(await dojotDB.get('test_level', 'test_key')).toEqual('test_value');
  });

  it('Should store the data in memory and on disk and then retrieve the same data from memory, when readInMemory is set to true.', async () => {
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, true, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Test */
    await dojotDB.put(
      'test_level', 'test_key', 'test_value',
    );

    /* Matches */
    expect(await dojotDB.getInMemory('test_level', 'test_key')).toEqual('test_value');
  });

  it('Should store the data to disk and then retrieve the same data, when readInMemory is set to false.', async () => {
    /* Init objects */
    let error;
    dojotDB = new LocalPersistenceManager(
      loggerMock, false, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Test */
    try {
      await dojotDB.get('test_level', 'test_key');
    } catch (e) {
      error = e;
    }

    /* Matches */
    expect(error.name).toEqual('NotFoundError');
  });

  it('Should perform all insertion operations on disk only, when readInMemory is set to false.', async () => {
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, false, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Prepare */
    const operations = new Map();
    operations.set('test_level_1', {
      config: {
        name: 'test_level_1',
        options: {
          keyEncoding: 'utf8',
          valueEncoding: 'utf8',
        },
      },
      operations: [
        { type: 'put', key: 'test_key_1', value: 'test_value_1' },
        { type: 'put', key: 'test_key_2', value: 'test_value_2' },
        { type: 'put', key: 'test_key_3', value: 'test_value_3' },
      ],
    });

    /* Test */
    await dojotDB.executeBatchForLevels(operations);

    /* Matches */
    expect(await dojotDB.managementLevel.get('test_level_1')).toBeTruthy();
    expect(await dojotDB.getInDisk('test_level_1', 'test_key_1')).toEqual('test_value_1');
    expect(await dojotDB.getInDisk('test_level_1', 'test_key_2')).toEqual('test_value_2');
    expect(await dojotDB.getInDisk('test_level_1', 'test_key_3')).toEqual('test_value_3');
  });

  it('Should perform all insertion operations on disk and in-memory, when readInMemory is set to true.', async () => {
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, true, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Prepare */
    const operations = new Map();
    operations.set('test_level_1', {
      config: {
        name: 'test_level_1',
        options: {
          keyEncoding: 'utf8',
          valueEncoding: 'utf8',
        },
      },
      operations: [
        { type: 'put', key: 'test_key_1', value: 'test_value_1' },
        { type: 'put', key: 'test_key_2', value: 'test_value_2' },
        { type: 'put', key: 'test_key_3', value: 'test_value_3' },
      ],
    });

    /* Test */
    await dojotDB.executeBatchForLevels(operations);

    /* Matches */
    expect(await dojotDB.memoryLevels.get('test_level_1')).toBeTruthy();
    expect(await dojotDB.getInMemory('test_level_1', 'test_key_1')).toEqual('test_value_1');
    expect(await dojotDB.getInMemory('test_level_1', 'test_key_2')).toEqual('test_value_2');
    expect(await dojotDB.getInMemory('test_level_1', 'test_key_3')).toEqual('test_value_3');
  });

  it('Should perform all deletion operations on disk only, when readInMemory is set to false.', async () => {
    const errors = [];
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, false, 'dojot_persistence_test',
    );
    await dojotDB.init();

    await dojotDB.put(
      'test_level_1', 'test_key_1', 'test_value_1',
    );
    await dojotDB.put(
      'test_level_1', 'test_key_2', 'test_value_2',
    );
    await dojotDB.put(
      'test_level_1', 'test_key_3', 'test_value_3',
    );

    /* Prepare */
    const operations = new Map();
    operations.set('test_level_1', {
      config: {
        name: 'test_level_1',
        options: {
          keyEncoding: 'utf8',
          valueEncoding: 'utf8',
        },
      },
      operations: [
        { type: 'del', key: 'test_key_1' },
        { type: 'del', key: 'test_key_2' },
        { type: 'del', key: 'test_key_3' },
      ],
    });

    /* Test */
    await dojotDB.executeBatchForLevels(operations);

    try {
      await dojotDB.getInDisk('test_level_1', 'test_key_1');
    } catch (error) {
      errors.push(error.name);
    }

    try {
      await dojotDB.getInDisk('test_level_1', 'test_key_2');
    } catch (error) {
      errors.push(error.name);
    }

    try {
      await dojotDB.getInDisk('test_level_1', 'test_key_3');
    } catch (error) {
      errors.push(error.name);
    }

    /* Matches */
    expect(errors[0]).toBe('NotFoundError');
    expect(errors[1]).toBe('NotFoundError');
    expect(errors[2]).toBe('NotFoundError');
  });

  it('Should perform all deletion operations on disk and in-memory, when readInMemory is set to true.', async () => {
    const errors = [];
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, true, 'dojot_persistence_test',
    );
    await dojotDB.init();

    await dojotDB.put(
      'test_level_1', 'test_key_1', 'test_value_1',
    );
    await dojotDB.put(
      'test_level_1', 'test_key_2', 'test_value_2',
    );
    await dojotDB.put(
      'test_level_1', 'test_key_3', 'test_value_3',
    );

    /* Prepare */
    const operations = new Map();
    operations.set('test_level_1', {
      config: {
        name: 'test_level_1',
        options: {
          keyEncoding: 'utf8',
          valueEncoding: 'utf8',
        },
      },
      operations: [
        { type: 'del', key: 'test_key_1' },
        { type: 'del', key: 'test_key_2' },
        { type: 'del', key: 'test_key_3' },
      ],
    });

    /* Test */
    await dojotDB.executeBatchForLevels(operations);

    try {
      await dojotDB.getInMemory('test_level_1', 'test_key_1');
    } catch (error) {
      errors.push(error.name);
    }

    try {
      await dojotDB.getInMemory('test_level_1', 'test_key_2');
    } catch (error) {
      errors.push(error.name);
    }

    try {
      await dojotDB.getInMemory('test_level_1', 'test_key_3');
    } catch (error) {
      errors.push(error.name);
    }

    /* Matches */
    expect(errors[0]).toBe('NotFoundError');
    expect(errors[1]).toBe('NotFoundError');
    expect(errors[2]).toBe('NotFoundError');
  });

  it('Should throw an error when the batch fails', async () => {
    expect.assertions(1);
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, true, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Prepare */
    const operations = new Map();
    operations.set('test_level_1', {
      operations: [
        { type: 'put', key: 'test_key_1', value: 'test_value_1' },
        { type: 'put', key: 'test_key_2', value: 'test_value_2' },
        { type: 'put', key: 'test_key_3', value: 'test_value_3' },
      ],
    });

    /* Test */
    try {
      await dojotDB.executeBatchForLevels(operations);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('Should delete the data from the database on disk, when readInMemory is set to false. ', async () => {
    /* Init objects */
    let error;
    dojotDB = new LocalPersistenceManager(
      loggerMock, false, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Prepare */
    await dojotDB.put(
      'test_level', 'test_key', 'test_value',
    );
    await dojotDB.del('test_level', 'test_key');

    /* Test */
    try {
      await dojotDB.getInDisk('test_level', 'test_key');
    } catch (e) {
      error = e;
    }

    /* Matches */
    expect(error.name).toBe('NotFoundError');
  });

  it('Should delete the data from the database in memory and on disk, when readInMemory is set to true. ', async () => {
    /* Init objects */
    let error;
    dojotDB = new LocalPersistenceManager(
      loggerMock, true, 'dojot_persistence_test',
    );
    await dojotDB.init();

    //* Prepare */
    await dojotDB.put(
      'test_level', 'test_key', 'test_value',
    );
    await dojotDB.del('test_level', 'test_key');

    /* Test */
    try {
      await dojotDB.getInMemory('test_level', 'test_key');
    } catch (e) {
      error = e;
    }

    /* Matches */
    expect(error.name).toBe('NotFoundError');
  });

  it('Should delete the data inserted on the disk, when insert in-memory operation fails ', async () => {
    /* Init objects */
    let putError;
    let getError;
    dojotDB = new LocalPersistenceManager(
      loggerMock, true, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Prepare */
    const sublevelInDisk = await dojotDB.initializeDiskLevel('test_level');
    try {
      await dojotDB.put(
        'test_level', 'test_key', 'test_value',
      );
    } catch (e) {
      putError = e;
    }

    /* Mocks */
    // eslint-disable-next-line no-unused-vars
    dojotDB.initializeLevel = jest.fn((sublevelName, options = undefined) => [
      sublevelInDisk,
      undefined,
    ]);

    /* Test */
    try {
      await dojotDB.getInDisk('test_level', 'test_key');
    } catch (e) {
      getError = e;
    }

    /* Matches */
    expect(putError.name).toBe('TypeError');
    expect(getError.name).toBe('NotFoundError');
  });

  it('Should restore deleted data from disk when delete in-memory operation fails', async () => {
    /* Init objects */
    let delError;
    dojotDB = new LocalPersistenceManager(
      loggerMock, true, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Prepare */
    await dojotDB.put(
      'test_level', 'test_key', 'test_value',
    );
    const sublevelInDisk = await dojotDB.initializeDiskLevel('test_level');

    /* Mocks */
    // eslint-disable-next-line no-unused-vars
    dojotDB.initializeLevel = jest.fn((sublevelName, options = undefined) => [
      sublevelInDisk,
      undefined,
    ]);

    /* Test */
    try {
      await dojotDB.del('test_level', 'test_key');
    } catch (e) {
      delError = e;
    }
    const value = await dojotDB.getInDisk('test_level', 'test_key');

    /* Matches */
    expect(delError.name).toBe('TypeError');
    expect(value).toEqual('test_value');
  });

  it('Should run the key stream', async (done) => {
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, true, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Prepare */
    await dojotDB.put(
      'test_level', 'test_key_1', 'test_value-1',
    );

    (await dojotDB.createKeyStream('test_level')).on('data', (data) => {
      expect(data).toEqual('test_key_1');
      done();
    });
  });

  it('Should run the value stream', async (done) => {
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, true, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Prepare */
    await dojotDB.put(
      'test_level', 'test_key_1', 'test_value_1',
    );

    (await dojotDB.createValueStream('test_level')).on('data', (data) => {
      expect(data).toEqual('test_value_1');
      done();
    });
  });

  it('Should run the entry stream', async (done) => {
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, true, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Prepare */
    await dojotDB.put(
      'test_level', 'test_key_1', 'test_value_1',
    );

    (await dojotDB.createStream('test_level')).on('data', (data) => {
      expect(data).toEqual({
        key: 'test_key_1',
        value: 'test_value_1',
      });
      done();
    });
  });

  it('Should run the key stream from memory', async (done) => {
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, true, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Prepare */
    await dojotDB.put(
      'test_level', 'test_key_1', 'test_value-1',
    );

    (await dojotDB.createKeyStreamInMemory('test_level')).on('data', (data) => {
      expect(data).toEqual('test_key_1');
      done();
    });
  });

  it('Should run the value stream from memory', async (done) => {
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, true, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Prepare */
    await dojotDB.put(
      'test_level', 'test_key_1', 'test_value_1',
    );

    (await dojotDB.createValueStreamInMemory('test_level')).on('data', (data) => {
      expect(data).toEqual('test_value_1');
      done();
    });
  });

  it('Should run the entry stream from memory', async (done) => {
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, true, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Prepare */
    await dojotDB.put(
      'test_level', 'test_key_1', 'test_value_1',
    );

    (await dojotDB.createStreamInMemory('test_level')).on('data', (data) => {
      expect(data).toEqual({
        key: 'test_key_1',
        value: 'test_value_1',
      });
      done();
    });
  });

  it('Should run the key stream from disk', async (done) => {
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, true, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Prepare */
    await dojotDB.put(
      'test_level', 'test_key_1', 'test_value-1',
    );

    (await dojotDB.createKeyStreamInDisk('test_level')).on('data', (data) => {
      expect(data).toEqual('test_key_1');
      done();
    });
  });

  it('Should run the value stream from disk', async (done) => {
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, true, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Prepare */
    await dojotDB.put(
      'test_level', 'test_key_1', 'test_value_1',
    );

    (await dojotDB.createValueStreamInDisk('test_level')).on('data', (data) => {
      expect(data).toEqual('test_value_1');
      done();
    });
  });

  it('Should run the entry stream from disk', async (done) => {
    /* Init objects */
    dojotDB = new LocalPersistenceManager(
      loggerMock, true, 'dojot_persistence_test',
    );
    await dojotDB.init();

    /* Prepare */
    await dojotDB.put(
      'test_level', 'test_key_1', 'test_value_1',
    );

    (await dojotDB.createStreamInDisk('test_level')).on('data', (data) => {
      expect(data).toEqual({
        key: 'test_key_1',
        value: 'test_value_1',
      });
      done();
    });
  });

  it('Should clear a sublevel', async () => {
    /* Prepare */
    expect.assertions(1);
    await dojotDB.init();
    await dojotDB.put(
      'test_level_1', 'test_key_1', 'test_value_1',
    );

    /* Test */
    await dojotDB.clear('test_level_1');

    try {
      await dojotDB.get('test_level_1', 'test_key_1');
    } catch (notFoundError) {
      expect(notFoundError.message).toEqual('Key not found in database [test_key_1]');
    }
  });

  it('Should clear a sublevel', async () => {
    /* Prepare */
    expect.assertions(1);
    await dojotDB.init();
    await dojotDB.put(
      'test_level_1', 'test_key_1', 'test_value_1',
    );

    /* Test */
    await dojotDB.clear('test_level_1');

    try {
      await dojotDB.get('test_level_1', 'test_key_1');
    } catch (notFoundError) {
      expect(notFoundError.message).toEqual('Key not found in database [test_key_1]');
    }
  });
});
