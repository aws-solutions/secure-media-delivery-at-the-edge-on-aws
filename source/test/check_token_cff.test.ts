const cff = require("../lambda/generate_secret_update_cff/cff.js");

const myMock = jest.spyOn(cff, "decodeString");

myMock.mockImplementation( param => {
  return Buffer.from(String(param), 'base64').toString();
});

describe("Check token", () => {
    
  
  test('Malformed token event', () => {
     // arrange and act
     var cffEvent = {
      "version":"1.0",
      "viewer":{
         "ip":"MY_IP"
      },
      "request":{
         "method":"GET",
         "uri":"/MYSESSIONID.MY_JWT_TOKEN/out/v1/00c6ff982d404e2f940b48495b243b3c/index.m3u8",         
         "headers":{
            "host":{
               "value":"dklf7fsi4gpzd.cloudfront.net"
            },
            "user-agent":{
               "value":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0"
            },
            "referer":{
               "value":"https://d26xf765ycwwd4.cloudfront.net/"
            },
            "origin":{
               "value":"https://d26xf765ycwwd4.cloudfront.net"
            }
         }
      }
   };
     var result = cff.handler(cffEvent);
     expect(result.statusCode).toBe(401);
     expect(result.statusDescription).toBe("Unauthorized");
  });

  test('Malformed token event - too many segments', () => {
    // arrange and act
    var cffEvent = {
     "version":"1.0",
     "viewer":{
        "ip":"MY_IP"
     },
     "request":{
        "method":"GET",
        "uri":"/MYSESSIONID.MY_JWT_TOKEN.MY_JWT_TOKEN.MY_JWT_TOKEN/out/v1/00c6ff982d404e2f940b48495b243b3c/index.m3u8",         
        "headers":{
           "host":{
              "value":"dklf7fsi4gpzd.cloudfront.net"
           },
           "user-agent":{
              "value":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0"
           },
           "referer":{
              "value":"https://d26xf765ycwwd4.cloudfront.net/"
           },
           "origin":{
              "value":"https://d26xf765ycwwd4.cloudfront.net"
           }
        }
     }
  };
    var result = cff.handler(cffEvent);
    expect(result.statusCode).toBe(401);
    expect(result.statusDescription).toBe("Unauthorized");
 });

  test('Malformed token headerSeg' , () => {
    // arrange and act
  var cffEvent = {
      "version": "1.0",
      "viewer": {
        "ip": "54.240.197.233"
      },
      "request": {
        "method": "GET",
        "uri": "/abcde.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c/out/v1/00c6ff982d404e2f940b48495b243b3c/index.m3u",
        "headers": {
          "host": {
            "value": "dklf7fsi4gpzd.cloudfront.net"
          },
          "user-agent": {
            "value": 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0'
          },
          "referer": {
            "value": 'https://mycloudfrontdomainname.cloudfront.net'
          },
          "origin": {
            "value": "https://d26xf765ycwwd4.cloudfront.net"
          }
        }
      }
    };  
    var result = cff.handler(cffEvent);
    expect(result.statusCode).toBe(401);
    expect(result.statusDescription).toBe("Unauthorized");
 });

 

 test('Expired token' , () => {
 
var cffEvent = {
    "version": "1.0",
    "viewer": {
      "ip": "54.240.197.233"
    },
    "request": {
      "method": "GET",
      "uri": "/cKyrFyOVnjza.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InNlY3JldDFfa2V5X3RvX3JlcGxhY2UifQ.eyJpcCI6ZmFsc2UsImNvIjpmYWxzZSwiY3R5IjpmYWxzZSwicmVnIjpmYWxzZSwic3NuIjp0cnVlLCJleHAiOjE2NTgzMTg3ODQsImhlYWRlcnMiOlsidXNlci1hZ2VudCJdLCJxcyI6W10sImludHNpZyI6Il8wR205T01QUnpFS1JMUldTaVM5SVJ0Z3o5RHJSV3MyNjAwV3duQkllY0UiLCJwYXRocyI6WyIvb3V0L3YxLzAwYzZmZjk4MmQ0MDRlMmY5NDBiNDg0OTViMjQzYjNjLyJdLCJleGMiOlsiL2Fkcy8iXSwibmJmIjoxNjQ1MDAwMDAwLCJpYXQiOjE2NTgzMDc5ODR9.oPYrdIJbJkAQvw1ST87mgxrzLnzjEuH5ds3H9kl5upE/out/v1/00c6ff982d404e2f940b48495b243b3c/index.m3u",
      "headers": {
        "host": {
          "value": "dklf7fsi4gpzd.cloudfront.net"
        },
        "user-agent": {
          "value": 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0'
        },
        "referer": {
          "value": 'https://mycloudfrontdomainname.cloudfront.net'
        },
        "origin": {
          "value": "https://d26xf765ycwwd4.cloudfront.net"
        }
      }
    }
  };  
  var result = cff.handler(cffEvent);
  console.log(JSON.stringify(result))
  expect(result.statusCode).toBe(401);
  expect(result.statusDescription).toBe("Unauthorized");
  
});

});

