/*********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

function buildSecondPartQueryString(lookbackMinutes) {

    const nowDate = new Date();

    const previousDate = new Date(nowDate.getTime() - lookbackMinutes * 60000);
    console.log("Query date between: " + previousDate + " and " + nowDate);
    var query_string = "";
    if (previousDate.getDay() == nowDate.getDay()){

        console.log("Same day query filter!");

        query_string = `WHERE CAST(year AS INTEGER) = CAST(date_format(current_timestamp - interval '${lookbackMinutes}' minute, '%Y') AS INTEGER)
            AND CAST(month AS INTEGER) = CAST(date_format(current_timestamp - interval '${lookbackMinutes}' minute, '%m') AS INTEGER)
            AND CAST(day AS INTEGER) = CAST(date_format(current_timestamp - interval '${lookbackMinutes}' minute, '%d') AS INTEGER)
            AND CAST(hour AS INTEGER) between
            CAST(date_format(current_timestamp - interval '${lookbackMinutes}' minute, '%H') AS INTEGER) and CAST(date_format(current_timestamp, '%H') AS INTEGER)`

    }else if (previousDate.getFullYear() == nowDate.getFullYear()) {

        console.log("different days - cross days query filter!");

        if (previousDate.getMonth() == nowDate.getMonth()) { // year and month are the same, but days are different
            query_string = ` WHERE
                    CAST(year AS INTEGER) = CAST(date_format(current_timestamp - interval '${lookbackMinutes}' minute, '%Y') AS INTEGER)
                    AND CAST(month AS INTEGER) = CAST(date_format(current_timestamp - interval '${lookbackMinutes}' minute, '%m') AS INTEGER)
                    AND (
                    (
                        CAST(day AS INTEGER) = CAST(date_format(current_timestamp - interval '${lookbackMinutes}' minute, '%d') AS INTEGER)
                        AND CAST(hour AS INTEGER) >= CAST(date_format(current_timestamp - interval '${lookbackMinutes}' minute, '%H') AS INTEGER)
                    )
                    OR
                    (
                        CAST(day AS INTEGER) = CAST(date_format(current_timestamp, '%d') AS INTEGER)
                        AND CAST(hour AS INTEGER) <= CAST(date_format(current_timestamp, '%H') AS INTEGER)
                    )
                    )`
        }
        else { 

            console.log("years are the same, but months and days are different");
            query_string = `WHERE
                    CAST(year AS INTEGER) = CAST(date_format(current_timestamp - interval '${lookbackMinutes}' minute, '%Y') AS INTEGER)
                    AND (
                    (
                        CAST(month AS INTEGER) = CAST(date_format(current_timestamp - interval '${lookbackMinutes}' minute, '%m') AS INTEGER)
                        AND CAST(day AS INTEGER) = CAST(date_format(current_timestamp - interval '${lookbackMinutes}' minute, '%d') AS INTEGER)
                        AND CAST(hour AS INTEGER) >= CAST(date_format(current_timestamp - interval '${lookbackMinutes}' minute, '%H') AS INTEGER)
                    )
                    OR
                    (
                        CAST(month AS INTEGER) = CAST(date_format(current_timestamp, '%m')AS INTEGER)
                        AND CAST(day AS INTEGER) = CAST(date_format(current_timestamp, '%d')AS INTEGER)
                        AND CAST(hour AS INTEGER) <= CAST(date_format(current_timestamp, '%H')AS INTEGER)
                    )
                    )`
        }
    } else { 
        console.log("years are different");
        query_string = `
               WHERE
               (
               (
                  CAST(year AS INTEGER) = CAST(date_format(current_timestamp - interval '${lookbackMinutes}' minute, '%Y') AS INTEGER)
                  AND CAST(month AS INTEGER) = CAST(date_format(current_timestamp - interval '${lookbackMinutes}' minute, '%m') AS INTEGER)
                  AND CAST(day AS INTEGER) = CAST(date_format(current_timestamp - interval '${lookbackMinutes}' minute, '%d') AS INTEGER)
                  AND CAST(hour AS INTEGER) >= CAST(date_format(current_timestamp - interval '${lookbackMinutes}' minute, '%H') AS INTEGER)
               )
               OR
               (
                  CAST(year AS INTEGER) = CAST(date_format(current_timestamp, '%Y') AS INTEGER)
                  AND CAST(month AS INTEGER) = CAST(date_format(current_timestamp, '%m') AS INTEGER)
                  AND CAST(day AS INTEGER) = CAST(date_format(current_timestamp, '%d') AS INTEGER)
                  AND CAST(hour AS INTEGER) <= CAST(date_format(current_timestamp, '%H') AS INTEGER)
               )
               )`
    }

    return query_string

}


function generateAthenaQuery(query_param) {
    console.log("Athena params=" + JSON.stringify(query_param));
    var thirdPartPreamble = "";
    var queryStringSecond_part = "";
    const queryStringFirstPart = `WITH Q1 AS (
         SELECT
               split(split_part(uri, '/',2),'.') AS path_first_part_array,
               ${query_param['uri_column_name']} AS uri,
               ${query_param['referer_column_name']} AS referer,
               ${query_param['ua_column_name']} AS user_agent,
               ${query_param['request_ip_column']} AS viewer_ip,
               CAST((CAST(${query_param['date_column_name']} AS VARCHAR) || ' ' || ${query_param['time_column_name']}) AS TIMESTAMP) AS time_point
         FROM \"${query_param['db_name']}\".\"${query_param['table_name']}\" `

    if (query_param['partitioned'] == 1) {
        queryStringSecond_part = buildSecondPartQueryString(query_param['lookback_period'])
        thirdPartPreamble = 'AND '
    } else {
        queryStringSecond_part = ''
        thirdPartPreamble = 'WHERE '
    }

    const queryStringThirdPart = `${thirdPartPreamble}CAST(${query_param['status_column_name']} AS INTEGER) IN (200, 206)
      AND CAST(${query_param['response_bytes_column_name']} AS INTEGER) > 1024),
   Q2 AS (
      SELECT
         path_first_part_array[1] as session_id,
         COUNT(DISTINCT(viewer_ip,uri)) AS request_cnt,
         date_diff(
               'second',
               MIN(time_point),
               MAX(time_point)
         ) AS time_range,
         MAX(time_point) as max_time_point,
         COUNT(DISTINCT referer) AS referer_cnt,
         COUNT(DISTINCT viewer_ip) AS IP_cnt,
         COUNT(DISTINCT user_agent) as UA_cnt
      FROM Q1
      WHERE
         time_point >= (now() - interval '${query_param['lookback_period']}' minute)
         AND cardinality(path_first_part_array) = 4
      GROUP BY 1
   ),
   Q3 AS (
      SELECT
         session_id,
         (${query_param['ip_rate']}*(Q2.request_cnt * 1.0 / Q2.time_range) /(SELECT approx_percentile((Q2.request_cnt * 1.0 / Q2.time_range), 0.50) FROM Q2)) as ip_rate,
         IF(Q2.IP_cnt > 1, ${query_param['ip_penalty']}, 0) as ip_penalty,
         IF(Q2.referer_cnt > 1, ${query_param['referer_penalty']}, 0) as referer_penalty,
         IF(Q2.UA_cnt > 1, ${query_param['ua_penalty']}, 0) as ua_penalty,
         max_time_point
         FROM Q2
         WHERE
               (SELECT COUNT(*) FROM Q2) >= ${query_param['min_sessions_number']}
               AND time_range >= ${query_param['min_session_duration']}
   )
   SELECT
      session_id,
      (ip_rate + ip_penalty + referer_penalty + ua_penalty) as score,
      ip_rate,
      ip_penalty,
      referer_penalty,
      ua_penalty,
      TO_UNIXTIME(max_time_point) as time_point
   FROM Q3
   WHERE
      (ip_rate + ip_penalty + referer_penalty + ua_penalty) > ${query_param['score_threshold']}`

    return queryStringFirstPart + queryStringSecond_part + queryStringThirdPart;


}

exports.handler = async (event, context) => {
    console.log("event=" + JSON.stringify(event));
    const params = {
        'ip_penalty': parseInt(process.env.ip_penalty),
        'referer_penalty': parseInt(process.env.referer_penalty),
        'ua_penalty': parseInt(process.env.ua_penalty),
        'ip_rate': parseInt(process.env.ip_rate),
        'uri_column_name': process.env.uri_column_name,
        'referer_column_name': process.env.referer_column_name,
        'ua_column_name': process.env.ua_column_name,
        'request_ip_column': process.env.request_ip_column,
        'status_column_name': process.env.status_column_name,
        'response_bytes_column_name': process.env.response_bytes_column_name,
        'date_column_name': process.env.date_column_name,
        'time_column_name': process.env.time_column_name,
        'db_name': process.env.db_name,
        'table_name': process.env.table_name,
        'min_sessions_number': parseInt(process.env.min_sessions_number),
        'min_session_duration': parseInt(process.env.min_session_duration),
        'score_threshold': parseFloat(process.env.score_threshold),
        'partitioned': parseInt(process.env.partitioned),
        'lookback_period': parseInt(process.env.lookback_period)
    }
    return generateAthenaQuery(params).replace('\n', '')

};