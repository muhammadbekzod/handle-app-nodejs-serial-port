const AWS = require("aws-sdk");
const BluetoothSerialPort = require("bluetooth-serial-port");

AWS.config.update({
    accessKeyId: "AKIAZFA4NTP3BQUQDMU2",
    secretAccessKey: "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",
    region: "us-east-1",
});

const btSerial = new BluetoothSerialPort.BluetoothSerialPort();

let latestBluetoothData = null;

// Event handler for Bluetooth data reception
function handleBluetoothData(buffer) {
    const bluetoothData = buffer.toString("utf-8");
    console.log("Bluetooth Data:", bluetoothData);

    // Parse Bluetooth data into key-value pairs
    const keyValuePairs = bluetoothData.split(",");
    const parsedData = {};

    // Construct an object from the key-value pairs
    for (const pair of keyValuePairs) {
        const [key, value] = pair.split(":");
        if (key && value) {
            parsedData[key.trim()] = value.trim();
        }
    }

    console.log("Parsed Bluetooth Data:", parsedData);

    // Check if parsed data is valid
    if (Object.keys(parsedData).length !== 0) {
        latestBluetoothData = parsedData;
    } else {
        console.log("Empty or invalid Bluetooth data. Skipping saving to DynamoDB.");
    }
}

// Add the "data" event listener
btSerial.on("data", handleBluetoothData);

// Event handler for Bluetooth discovery
btSerial.on("found", function (address, name) {
    btSerial.findSerialPortChannel(
        address,
        function (channel) {
            btSerial.connect(
                address,
                channel,
                function () {
                    console.log("Connected");

                    btSerial.write(Buffer.from("my data", "utf-8"), function (err, bytesWritten) {
                        if (err) console.log(err);
                    });
                },
                function () {
                    console.log("Cannot connect");
                }
            );
        }
    );
});

btSerial.inquire();

// Function to save data to DynamoDB every 2 seconds
setInterval(() => {
    if (latestBluetoothData != null) {
        saveToDynamoDB(latestBluetoothData);
    }
}, 2000);

// Function to save data to DynamoDB
function saveToDynamoDB(data) {
    const docClient = new AWS.DynamoDB.DocumentClient();

    const params = {
        TableName: "handle_data", // Replace with your DynamoDB table name
        Item: {
            Id: Date.now().toString(),
            data: data,
        },
    };

    docClient.put(params, function (err, data) {
        if (err) {
            console.error("Error saving data to DynamoDB:", err);
        } else {
            console.log("Data saved to DynamoDB");
        }
    });
}