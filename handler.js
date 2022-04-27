"use strict";

const AWS = require("aws-sdk");
const uuid = require("uuid");
AWS.config.update({
  region: "us-east-1",
});
const dynamodb = new AWS.DynamoDB.DocumentClient();
const dynamodbTableName = "todos";

// exports.handler = async function (event) {
//   console.log("Request event: ", event);
//   let response;
//   switch (true) {
//     case event.httpMethod === "GET" && event.path === todos:
//       response = await getAllTodos();
//       break;

//     case event.httpMethod === "GET" && event.path === todo:
//       response = await getTodo(event.queryStringParameters.id);
//       break;
//     case event.httpMethod === "POST" && event.path === todo:
//       console.log("body-->", event.body);
//       response = await saveTodo(JSON.parse(event.body));
//       break;
//     case event.httpMethod === "PATCH" && event.path === todo:
//       const requestBody = JSON.parse(event.body);
//       response = await modifyTodo(
//         requestBody.id,
//         requestBody.updateKey,
//         requestBody.updateValue
//       );
//       break;
//     case event.httpMethod === "DELETE" && event.path === todo:
//       response = await deleteTodo(JSON.parse(event.body).id);
//       break;
//     default:
//       response = buildResponse(404, "404 Not Found");
//   }
//   return response;
// };

module.exports.getAllTodos = async (event) => {
  console.log("event-->", event);
  const params = {
    TableName: dynamodbTableName,
  };
  const allTodos = await scanDynamoRecords(params, []);
  const body = {
    todos: allTodos,
  };
  return buildResponse(200, body);
};

const scanDynamoRecords = async (scanParams, itemArray) => {
  try {
    const dynamoData = await dynamodb.scan(scanParams).promise();
    itemArray = itemArray.concat(dynamoData.Items);
    if (dynamoData.LastEvaluatedKey) {
      scanParams.ExclusiveStartkey = dynamoData.LastEvaluatedKey;
      return await scanDynamoRecords(scanParams, itemArray);
    }
    return itemArray;
  } catch (error) {
    console.log(error);
  }
};

module.exports.getTodo = async (event) => {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      id: event.queryStringParameters.id,
    },
  };
  return await dynamodb
    .get(params)
    .promise()
    .then(
      (response) => {
        return buildResponse(200, response.Item);
      },
      (error) => {
        console.log(error);
      }
    );
};

module.exports.saveTodo = async (event) => {
  const data = JSON.parse(event.body);
  const params = {
    TableName: dynamodbTableName,
    Item: {
      id: uuid.v1(),
      todoDetail: data.todoDetail,
    },
  };
  return await dynamodb
    .put(params)
    .promise()
    .then(
      (response) => {
        console.log("save Todo-->", response);
        const body = {
          Operation: "SAVE",
          Message: "SUCCESS",
          Item: response.Item,
        };
        return buildResponse(200, body);
      },
      (error) => {
        console.log(error);
      }
    );
};

module.exports.modifyTodo = async (event) => {
  const data = JSON.parse(event.body);
  const id = data.id;
  const updateKey = data.updateKey;
  const updateValue = data.updateValue;
  const params = {
    TableName: dynamodbTableName,
    Key: {
      id: id,
    },
    UpdateExpression: `set ${updateKey} = :value`,
    ExpressionAttributeValues: {
      ":value": updateValue,
    },
    ReturnValues: "UPDATED_NEW",
  };
  return await dynamodb
    .update(params)
    .promise()
    .then(
      (response) => {
        const body = {
          Operation: "UPDATE",
          Message: "SUCCESS",
          UpdatedAttributes: response,
        };
        return buildResponse(200, body);
      },
      (error) => {
        console.log(error);
      }
    );
};

module.exports.deleteTodo = async (event) => {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      id: event.queryStringParameters.id,
    },
    ReturnValues: "ALL_OLD",
  };
  return await dynamodb
    .delete(params)
    .promise()
    .then(
      (response) => {
        const body = {
          Operation: "DELETE",
          Message: "SUCCESS",
          Item: response,
        };
        return buildResponse(200, body);
      },
      (error) => {
        console.log(error);
      }
    );
};

const buildResponse = (statusCode, body) => {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
};
