const AWS = require("aws-sdk");
const BluetoothSerialPort = require("bluetooth-serial-port");

// Configure AWS credentials
AWS.config.update({
    accessKeyId: "AKIAZFA4NTP3BQUQDMU2",
    secretAccessKey: "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",
    region: "us-east-1",
});

const btSerial = new BluetoothSerialPort.BluetoothSerialPort();

// Function to handle Bluetooth data
let receivedData = '';

function handleBluetoothData(buffer) {
    const data = buffer.toString("utf-8");
    console.log("Received Bluetooth Data:", data);

    // Concatenate the received data
    receivedData += data;

    // Check if the received data contains a complete line
    if (receivedData.includes('\n')) {
        // Split the received data into individual lines
        const lines = receivedData.split('\n');

        // Process each complete line
        lines.forEach(line => {
            if (line.trim() !== '') {
                // Save the line to DynamoDB
                saveToDynamoDB(line.trim());
            }
        });

        // Reset the received data to capture the remaining lines
        receivedData = lines.pop(); // Remove the last element which might be incomplete
    }
}

// Event handler for incoming data
btSerial.on("data", handleBluetoothData);

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

// Set interval to inquire for Bluetooth devices and save data to DynamoDB every 5 seconds
setInterval(() => {
    inquireBluetoothDevices();
    if (receivedData.trim() !== '') {
        saveToDynamoDB(receivedData.trim());
        receivedData = ''; // Reset receivedData after saving
    }
}, 10000); // Inquire every 5 seconds

// Function to handle Bluetooth device discovery
function handleDeviceFound(address, name) {
    btSerial.findSerialPortChannel(
        address,
        function (channel) {
            btSerial.connect(
                address,
                channel,
                function () {
                    console.log("Connected to", name, "at address", address);
                }
            );
        }
    );
}

// Event handler for discovering Bluetooth devices
btSerial.on("found", handleDeviceFound);

// Function to inquire for Bluetooth devices periodically
function inquireBluetoothDevices() {
    btSerial.inquire();
}
