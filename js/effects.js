(function () {
    function drawName(context, name, x, y, color) {
        context.save();
        context.font = '700 16px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.lineWidth = 4;
        context.strokeStyle = '#ffffff';
        context.fillStyle = color;
        context.strokeText(name, x, y);
        context.fillText(name, x, y);
        context.restore();
    }

    function drawInnerCircle(context, x, y, scale = 1) {
        context.save();
        context.beginPath();
        context.arc(x, y, Math.max(3, 6 * scale), 0, Math.PI * 2);
        context.fillStyle = '#000000';
        context.fill();
        context.restore();
    }

    function drawRotatingAimLine(context, x, y, angle, scale = 1) {
        const length = Math.max(20, 34 * scale);
        const endX = x + Math.cos(angle) * length;
        const endY = y + Math.sin(angle) * length;

        context.save();
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(endX, endY);
        context.lineWidth = Math.max(2, 4 * scale);
        context.lineCap = 'round';
        context.strokeStyle = '#000000';
        context.stroke();
        context.restore();
    }

    function drawPlayerIcon(context, image, x, y, size, color) {
        const halfSize = size / 2;

        context.save();

        context.beginPath();
        context.arc(x, y, halfSize * 0.78, 0, Math.PI * 2);
        context.fillStyle = color;
        context.globalAlpha = 0.16;
        context.fill();
        context.globalAlpha = 1;

        if (image.complete && image.naturalWidth > 0) {
            context.drawImage(image, x - halfSize, y - halfSize, size, size);
        } else {
            context.beginPath();
            context.arc(x, y, halfSize * 0.62, 0, Math.PI * 2);
            context.fillStyle = color;
            context.fill();
        }

        context.restore();
    }

    function drawShieldIcon(context, x, y, size, color = '#56ccf2', outlineColor = '#2f80ed') {
        context.save();
        context.beginPath();
        context.moveTo(x, y - size);
        context.lineTo(x + size * 0.75, y - size * 0.55);
        context.lineTo(x + size * 0.55, y + size * 0.45);
        context.quadraticCurveTo(x, y + size, x - size * 0.55, y + size * 0.45);
        context.lineTo(x - size * 0.75, y - size * 0.55);
        context.closePath();
        context.fillStyle = color;
        context.strokeStyle = outlineColor;
        context.lineWidth = 3;
        context.fill();
        context.stroke();
        context.restore();
    }

    function drawShieldAura(context, x, y, color = '#56ccf2') {
        context.save();
        context.beginPath();
        context.arc(x, y, 33, 0, Math.PI * 2);
        context.strokeStyle = color;
        context.lineWidth = 4;
        context.setLineDash([8, 5]);
        context.stroke();
        context.restore();
    }

    function drawPowerIcon(context, x, y, size) {
        context.save();
        context.translate(x, y);
        context.rotate(-Math.PI / 5);
        context.beginPath();
        context.moveTo(size * 0.95, 0);
        context.lineTo(size * 0.35, -size * 0.45);
        context.lineTo(-size * 0.65, -size * 0.45);
        context.quadraticCurveTo(-size * 0.95, 0, -size * 0.65, size * 0.45);
        context.lineTo(size * 0.35, size * 0.45);
        context.closePath();
        context.fillStyle = '#f2c94c';
        context.strokeStyle = '#f2994a';
        context.lineWidth = 3;
        context.fill();
        context.stroke();
        context.beginPath();
        context.moveTo(-size * 0.25, -size * 0.28);
        context.lineTo(size * 0.35, -size * 0.28);
        context.strokeStyle = '#fff2a8';
        context.lineWidth = 2;
        context.stroke();
        context.restore();
    }

    function drawPowerAura(context, x, y) {
        context.save();
        context.beginPath();
        context.arc(x, y, 37, 0, Math.PI * 2);
        context.strokeStyle = '#f2c94c';
        context.lineWidth = 4;
        context.setLineDash([3, 6]);
        context.stroke();
        context.restore();
    }

    function createExplosion({ Bodies, Body, Composite }, world, x, y) {
        const colors = ['#eb5757', '#f2994a', '#f2c94c', '#2f80ed', '#27ae60'];
        const particles = [];

        for (let index = 0; index < 26; index++) {
            const angle = (Math.PI * 2 * index) / 26;
            const speed = 8 + Math.random() * 8;
            const radius = 4 + Math.random() * 5;
            const particle = Bodies.circle(x, y, radius, {
                frictionAir: 0.035,
                restitution: 0.8,
                render: { fillStyle: colors[index % colors.length] }
            });

            Body.setVelocity(particle, {
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed
            });

            particles.push(particle);
        }

        Composite.add(world, particles);
    }

    window.GameEffects = {
        drawName,
        drawInnerCircle,
        drawRotatingAimLine,
        drawPlayerIcon,
        drawShieldIcon,
        drawShieldAura,
        drawPowerIcon,
        drawPowerAura,
        createExplosion
    };
})();
