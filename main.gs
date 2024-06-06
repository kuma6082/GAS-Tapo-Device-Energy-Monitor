function main() {
  try {
    const token = getTapoToken();
    const devices = getTapoDeviceList(token);
    Logger.log("デバイスリスト: ");
    devices.forEach(function(device) {
      processDevice(token, device);
    });
  } catch (e) {
    Logger.log("エラー: " + e.message);
  }
}

function getTapoToken() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const username = scriptProperties.getProperty('TAPO_USERNAME');
  const password = scriptProperties.getProperty('TAPO_PASSWORD');

  const url = "https://aps1-wap.tplinkcloud.com";
  const terminalUUID = Utilities.getUuid();

  const payload = {
    method: "login",
    params: {
      appType: "Tapo_Android",
      cloudUserName: username,
      cloudPassword: password,
      terminalUUID: terminalUUID
    }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  };

  Logger.log("送信ペイロード: " + JSON.stringify(payload));

  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());

  Logger.log("受信レスポンス: " + JSON.stringify(data));

  if (data.error_code === 0) {
    return data.result.token;
  } else {
    throw new Error("認証失敗: " + data.msg);
  }
}

function getTapoDeviceList(token) {
  const url = `https://aps1-wap.tplinkcloud.com?token=${token}`;
  const payload = {
    method: "getDeviceList"
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  };

  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());
  Logger.log("デバイスリストレスポンス: " + JSON.stringify(data));
  return data.result.deviceList;
}

function getEnergyData(token, deviceId) {
  const url = `https://aps1-wap.tplinkcloud.com?token=${token}`;
  const payload = {
    method: "passthrough",
    params: {
      deviceId: deviceId,
      requestData: JSON.stringify({
        system: {
          get_sysinfo: {}
        },
        emeter: {
          get_realtime: {}
        }
      })
    }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  };

  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());

  Logger.log("エネルギーデータレスポンス: " + JSON.stringify(data));

  if (data.error_code === 0) {
    const responseData = JSON.parse(data.result.responseData);
    if (responseData.emeter && responseData.emeter.get_realtime) {
      return responseData.emeter.get_realtime;
    } else {
      throw new Error("エネルギーデータの取得に失敗しました。");
    }
  } else {
    throw new Error("APIエラー: " + data.msg);
  }
}

function processDevice(token, device) {
  const alias = Utilities.newBlob(Utilities.base64Decode(device.alias)).getDataAsString();
  Logger.log("デバイス名 (デコード済み): " + alias);
  Logger.log("デバイスタイプ: " + device.deviceModel);
  Logger.log("デバイスID: " + device.deviceId);
  Logger.log("デバイスステータス: " + device.status);
  Logger.log("デバイス詳細情報: " + JSON.stringify(device));

  if (device.status === 1) {
    try {
      const energyData = getEnergyData(token, device.deviceId);
      logEnergyData(energyData);
    } catch (e) {
      Logger.log("エネルギーデータの取得エラー: " + e.message);
    }
  } else {
    Logger.log(`デバイスがオフラインです: ${alias}`);
  }
}

function logEnergyData(energyData) {
  Logger.log("消費電力 (W): " + energyData.power);
  Logger.log("累積エネルギー (kWh): " + energyData.total);
  Logger.log("電圧 (V): " + energyData.voltage);
  Logger.log("電流 (A): " + energyData.current);
}
