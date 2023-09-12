// Get references to UI elements
let connectButton = document.getElementById("connect");
let disconnectButton = document.getElementById("disconnect");
let downloadButton = document.getElementById("download");

let terminalContainer = document.getElementById("terminal");
let sendForm = document.getElementById("send-form");
let inputField = document.getElementById("input");
let thrustResults = document.getElementById("thrust");
let ampResults = document.getElementById("amps");
let voltsResults = document.getElementById("volts");

let timeResult = document.getElementById("time");


// Connect to the device on Connect button click
connectButton.addEventListener("click", function () {
  connect();
});

// Disconnect from the device on Disconnect button click
disconnectButton.addEventListener("click", function () {
  disconnect();
});

// Download csv file
downloadButton.addEventListener("click", function () {
  downloadCSV(data);
});

// Handle form submit event
sendForm.addEventListener("submit", function (event) {
  event.preventDefault(); // Prevent form sending
  send(inputField.value); // Send text field contents
  inputField.value = ""; // Zero text field
  inputField.focus(); // Focus on text field
});

// Selected device object cache
let deviceCache = null;

// Launch Bluetooth device chooser and connect to the selected
function connect() {
  return (deviceCache ? Promise.resolve(deviceCache) : requestBluetoothDevice())
    .then((device) => connectDeviceAndCacheCharacteristic(device))
    .then((characteristic) => startNotifications(characteristic))
    .catch((error) => log(error));
}

function requestBluetoothDevice() {
  log("Requesting bluetooth device...");

  return navigator.bluetooth
    .requestDevice({
      filters: [{ services: [0xffe0] }],
    })
    .then((device) => {
      log('"' + device.name + '" bluetooth device selected');
      deviceCache = device;

      // Added line
      deviceCache.addEventListener(
        "gattserverdisconnected",
        handleDisconnection
      );

      return deviceCache;
    });
}

function handleDisconnection(event) {
  let device = event.target;

  log(
    '"' +
      device.name +
      '" bluetooth device disconnected, trying to reconnect...'
  );

  connectDeviceAndCacheCharacteristic(device)
    .then((characteristic) => startNotifications(characteristic))
    .catch((error) => log(error));
}

// Characteristic object cache
let characteristicCache = null;

// Connect to the device specified, get service and characteristic
function connectDeviceAndCacheCharacteristic(device) {
  if (device.gatt.connected && characteristicCache) {
    return Promise.resolve(characteristicCache);
  }

  log("Connecting to GATT server...");

  return device.gatt
    .connect()
    .then((server) => {
      log("GATT server connected, getting service...");

      return server.getPrimaryService(0xffe0);
    })
    .then((service) => {
      log("Service found, getting characteristic...");

      return service.getCharacteristic(0xffe1);
    })
    .then((characteristic) => {
      log("Characteristic found");
      characteristicCache = characteristic;

      return characteristicCache;
    });
}

// Enable the characteristic changes notification
function startNotifications(characteristic) {
  log("Starting notifications...");

  return characteristic.startNotifications().then(() => {
    log("Notifications started");
    // Added line
    characteristic.addEventListener(
      "characteristicvaluechanged",
      handleCharacteristicValueChanged
    );
  });
}



function disconnect() {
  if (deviceCache) {
    log('Disconnecting from "' + deviceCache.name + '" bluetooth device...');
    deviceCache.removeEventListener(
      "gattserverdisconnected",
      handleDisconnection
    );

    if (deviceCache.gatt.connected) {
      deviceCache.gatt.disconnect();
      log('"' + deviceCache.name + '" bluetooth device disconnected');
    } else {
      log(
        '"' + deviceCache.name + '" bluetooth device is already disconnected'
      );
    }
  }

  // Added condition
  if (characteristicCache) {
    characteristicCache.removeEventListener(
      "characteristicvaluechanged",
      handleCharacteristicValueChanged
    );
    characteristicCache = null;
  }

  deviceCache = null;
}

function removeChar (item) {
  return item !== '\x00';
};

// Data receiving
function handleCharacteristicValueChanged(event) {
    let value = new TextDecoder().decode(event.target.value); //value is a string
    // let valueString = value.toString();
    // log(value, 'in');   
    
    const splitArray = value.split(" ");

    const thrustValue = splitArray[0];
    const ampsValue = splitArray[1];
    const voltsValue = splitArray[2];

    const thustFinal = removeNullBytes(thrustValue) //*2.2046;
    const ampsFinal = removeNullBytes(ampsValue);
    const voltsFinal = removeNullBytes(voltsValue);

    const timeStamp = new Date().toLocaleTimeString();

    const newData = { time: timeStamp, thust: thustFinal, amps: ampsFinal, volts: voltsFinal};

    data.push(newData);

    console.log(`timestamp: ${timeStamp}`);
    console.log(`thrust: ${thustFinal}`);
    console.log(`amps: ${ampsFinal}`);
    console.log(`volts: ${voltsFinal}`);
    
    console.log(data);

   

    
    function removeNullBytes(str){
      return str.split("").filter(char => char.codePointAt(0)).join("")
    }
          
    thrustResults.textContent = thustFinal;
    ampResults.textContent = ampsFinal;
    voltsResults.textContent = voltsFinal;

    timeResult.textContent = timeStamp;
    
  }



// Send data to the connected device
function send(data) {
  data = String(data);

  function writeToCharacteristic(characteristic, data) {
    characteristic.writeValue(new TextEncoder().encode(data));
  }

  if (!data || !characteristicCache) {
    return;
  }

  data += '\n';

  if (data.length > 20) {
    let chunks = data.match(/(.|[\r\n]){1,20}/g);

    writeToCharacteristic(characteristicCache, chunks[0]);

    for (let i = 1; i < chunks.length; i++) {
      setTimeout(() => {
        writeToCharacteristic(characteristicCache, chunks[i]);
      }, i * 100);
    }
  }
  else {
    writeToCharacteristic(characteristicCache, data);
  }

  log(data, 'out');
}

// Output to terminal
function log(data, type = "") {
    terminalContainer.removeChild(terminalContainer.firstElementChild);
    terminalContainer.insertAdjacentHTML(
      "beforeend",
      "<div" + (type ? ' class="' + type + '"' : "") + ">" + data + "</div>"
    );
  }

  function downloadCSV(data) {
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'data.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  
  function convertToCSV(data) {
    const rows = [];
    for (const obj of data) {
      const values = [];
      for (const key in obj) {
        values.push(obj[key]);
      }
      rows.push(values.join(','));
    }
    return rows.join('\n');
  }
  
  
  const data = [
    { time: 'Time', thust: 'Thrust', amps: 'Amps', volts: 'Volts'},
  ];


  
  
  
  