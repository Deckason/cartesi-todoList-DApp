const { ethers } = require("ethers");

const rollup_server = process.env.ROLLUP_HTTP_SERVER_URL;
console.log("HTTP rollup_server url is " + rollup_server);

const hex2string = (hex) => {
  return ethers.toUtf8String(hex);
};

const string2hex = (payload) => {
  return ethers.hexlify(ethers.toUtf8Bytes(payload));
};

let tasks = [];

// Function to handle adding a task
async function handle_add_task(data) {
  console.log("Received add task request data " + JSON.stringify(data));
  const payload = data["payload"];
  const taskDescription = hex2string(payload);

  // Add the task
  tasks.push({ id: tasks.length + 1, task: taskDescription, completed: false });

  const notice_req = await fetch(rollup_server + "/notice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payload: string2hex(`Task added: ${taskDescription}`) }),
  });
  return "accept";
}

// Function to handle removing a task
async function handle_remove_task(data) {
  console.log("Received remove task request data " + JSON.stringify(data));
  const payload = data["payload"];
  const taskId = parseInt(hex2string(payload));

  tasks = tasks.filter(task => task.id !== taskId);

  const notice_req = await fetch(rollup_server + "/notice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payload: string2hex(`Task with ID ${taskId} removed`) }),
  });
  return "accept";
}

// Function to handle getting all tasks
async function handle_get_tasks(data) {
  console.log("Received get tasks request data " + JSON.stringify(data));
  const payload = data["payload"];
  const route = hex2string(payload);

  let responseObject = JSON.stringify(tasks);
  const report_req = await fetch(rollup_server + "/report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payload: string2hex(responseObject) }),
  });

  return "accept";
}

// Handlers mapping
var handlers = {
  add_task: handle_add_task,
  remove_task: handle_remove_task,
  get_tasks: handle_get_tasks,
};

var finish = { status: "accept" };

(async () => {
  while (true) {
    const finish_req = await fetch(rollup_server + "/finish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "accept" }),
    });

    console.log("Received finish status " + finish_req.status);

    if (finish_req.status == 202) {
      console.log("No pending rollup request, trying again");
    } else {
      const rollup_req = await finish_req.json();
      var handler = handlers[rollup_req["request_type"]];
      finish["status"] = await handler(rollup_req["data"]);
    }
  }
})();