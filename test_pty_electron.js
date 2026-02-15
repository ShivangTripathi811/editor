const { app } = require('electron');
const pty = require('node-pty');

app.whenReady().then(() => {
  try {
    console.log('Attempting to spawn pty...');
    const ptyProcess = pty.spawn('bash', [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: process.env.HOME,
      env: process.env
    });
    console.log('pty spawned successfully, pid:', ptyProcess.pid);
    ptyProcess.kill();
    console.log('pty killed');
    app.quit();
    process.exit(0);
  } catch (error) {
    console.error('Failed to use node-pty:', error);
    app.quit();
    process.exit(1);
  }
});
