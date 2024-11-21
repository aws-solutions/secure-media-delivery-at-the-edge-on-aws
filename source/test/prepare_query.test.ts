// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const sybmitQuery = require('../lambda/prepare_query/index.js');

describe('process.env', () => {
  const env = process.env

  beforeEach(() => {
      jest.resetModules();

      process.env = {  
        ip_penalty: '1',
        referer_penalty: '2',
        ua_penalty: '2',
        ip_rate: '2',
        uri_column_name: 'uri',
        referer_column_name: 'referer_column_name',
        ua_column_name: 'ua_column_name',
        request_ip_column: 'request_ip_column',
        status_column_name: 'status_column_name',
        response_bytes_column_name: 'response_bytes_column_name',
        date_column_name: 'date_column_name',
        time_column_name: 'time_column_name',
        db_name: 'env.db_name',
        table_name: 'table_name',
        min_sessions_number : '10',
        min_session_duration: '1',
        score_threshold: '2.2',
        partitioned: '1',
        lookback_period: '10'
       };
  })

  afterEach(() => {
      process.env = env
  })

  test('Submit query- Same day - result OK', async () => {

    jest
    .useFakeTimers()
    .setSystemTime(new Date('2020-02-02 10:05:00'));

    var result = await sybmitQuery.handler({});
    expect(result).toHaveLength;
      

  });

  test('Submit query- Different day, same year - result OK', async () => {

    jest
    .useFakeTimers()
    .setSystemTime(new Date('2020-02-02 00:05:00'));

    var result = await sybmitQuery.handler({});
    expect(result).toHaveLength;
      

  });

  test('Submit query- Different day, same year, different month and different day - result OK', async () => {

    jest
    .useFakeTimers()
    .setSystemTime(new Date('2020-02-01 00:05:00'));

    var result = await sybmitQuery.handler({});
    expect(result).toHaveLength;
      

  });

  test('Submit query- Different years - result OK', async () => {

    jest
    .useFakeTimers()
    .setSystemTime(new Date('2020-01-01 00:05:00'));

    var result = await sybmitQuery.handler({});
    expect(result).toHaveLength;
      

  });

  test('Submit query- Different years, partitioned = 0 - result OK', async () => {

    jest
    .useFakeTimers()
    .setSystemTime(new Date('2020-01-01 00:05:00'));

    process.env = {  
      ip_penalty: '1',
      referer_penalty: '2',
      ua_penalty: '2',
      ip_rate: '2',
      uri_column_name: 'uri',
      referer_column_name: 'referer_column_name',
      ua_column_name: 'ua_column_name',
      request_ip_column: 'request_ip_column',
      status_column_name: 'status_column_name',
      response_bytes_column_name: 'response_bytes_column_name',
      date_column_name: 'date_column_name',
      time_column_name: 'time_column_name',
      db_name: 'env.db_name',
      table_name: 'table_name',
      min_sessions_number : '10',
      min_session_duration: '1',
      score_threshold: '2.2',
      partitioned: '0',
      lookback_period: '10'
     };

    var result = await sybmitQuery.handler({});
    expect(result).toHaveLength;
      

  });



})

