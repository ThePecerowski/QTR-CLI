'use strict';

const net = require('net');

// Windows named pipe adresi (C++ tarafindaki IPCServer.h ile eslesir)
const PIPE_PATH = '\\\\.\\pipe\\SpeakerQuarterIPC';

// Baglanti zaman asimi (ms)
const CONNECT_TIMEOUT_MS = 3000;

/**
 * Uygulamaya bir JSON komutu gonderir ve JSON yanitini bekler.
 *
 * @param {object} payload - Gonderilecek nesne (orn. { cmd: 'GET_DEVICES' })
 * @returns {Promise<object>} - Uygulamadan gelen parse edilmis yanit
 * @throws {Error} Uygulama calismiyor ya da baglanti kurulamazsa
 */
function sendCommand(payload) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(PIPE_PATH);
    let responseData = '';
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        socket.destroy();
        reject(new Error(
          'SpeakerQuarter uygulamasina baglanamadi.\n' +
          'Uygulamanin calisir durumda oldugunu kontrol edin.'
        ));
      }
    }, CONNECT_TIMEOUT_MS);

    socket.on('connect', () => {
      socket.write(JSON.stringify(payload) + '\n');
    });

    socket.on('data', (chunk) => {
      responseData += chunk.toString('utf8');
      // Yanit newline ile bitmesini bekle
      if (responseData.includes('\n')) {
        clearTimeout(timeout);
        socket.destroy();
        if (!settled) {
          settled = true;
          try {
            const parsed = JSON.parse(responseData.trim());
            resolve(parsed);
          } catch (e) {
            reject(new Error('Sunucudan gecersiz yanit alindi: ' + responseData));
          }
        }
      }
    });

    socket.on('error', (err) => {
      clearTimeout(timeout);
      if (!settled) {
        settled = true;
        const isNotRunning = err.code === 'ENOENT' || err.code === 'ECONNREFUSED';
        reject(new Error(
          isNotRunning
            ? 'SpeakerQuarter uygulamasi calismiyor. Lutfen once uygulamayi baslatin.'
            : `Baglanti hatasi: ${err.message}`
        ));
      }
    });

    socket.on('close', () => {
      clearTimeout(timeout);
      if (!settled && responseData) {
        settled = true;
        try {
          resolve(JSON.parse(responseData.trim()));
        } catch {
          reject(new Error('Sunucudan gecersiz yanit: ' + responseData));
        }
      }
    });
  });
}

/**
 * Uygulamanin calisip calismadigini pipe'a baglanarak kontrol eder.
 * @returns {Promise<boolean>}
 */
async function isAppRunning() {
  try {
    const res = await sendCommand({ cmd: 'GET_STATUS' });
    return res.ok === true;
  } catch {
    return false;
  }
}

module.exports = { sendCommand, isAppRunning };
