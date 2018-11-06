
$(document).ready(function() {
    var data;
    var socket = io.connect();
    socket.on('incomingCall', function (incomingCall) {
        console.log('incoming: ', incomingCall);
        chart();
    });
    socket.on('event', function (e, avgSl, avgCt, tot) {
        //console.log('event: ', e);
        $('#SL').html("current SL over all sites: " + avgSl + '% in 45 Sekunden');
        if(avgSl >= 95){
            $('#SL').css('color', 'green');
        }else{

            $('#SL').css('color', 'red');
        }
        $('#callTime').html('actual average call duration: ' + avgCt + ' mins');
        console.log('avgSL: ', avgSl);
        $('#tots').html('total available agents vs. call amount: ' + tot[0].totAgents + ' / ' + tot[0].totAmount);
        console.log('avgSL: ', avgSl);
        chart(e);

    });

    data = [
        {
            "SITE": "Germany, Muenster",
            "BESETZT": "INITIALIZING",
            "FREI": "INITIALIZING",
            "WARTESCHLANGE": "INITIALIZING"
        },
        {
            "SITE": "Argentina, Buenos Aires",
            "BESETZT": "INITIALIZING",
            "FREI": "INITIALIZING",
            "WARTESCHLANGE": "INITIALIZING"
        },
        {
            "SITE": "Estonia, Tallinn",
            "BESETZT": "INITIALIZING",
            "FREI": "INITIALIZING",
            "WARTESCHLANGE": "INITIALIZING"
        },
        {
            "SITE": "Sweden, Malmo",
            "BESETZT": "INITIALIZING",
            "FREI": "INITIALIZING",
            "WARTESCHLANGE": "INITIALIZING"
        },
        {
            "SITE": "India, Bangalore",
            "BESETZT": "INITIALIZING",
            "FREI": "INITIALIZING",
            "WARTESCHLANGE": "INITIALIZING"
        },
        {
            "SITE": "USA, Seattle",
            "BESETZT": "INITIALIZING",
            "FREI": "INITIALIZING",
            "WARTESCHLANGE": "INITIALIZING" }
    ];
    $('#table').bootstrapTable({data : data});
    $('#table').bootstrapTable('hideLoading');
    function setData(pos,e){
        $('#table').bootstrapTable('updateRow', {
            index: pos,
            row: {
                SL              : e.serviceLevel + '%',
                TOTAL           : e.callAmount,
                VERFÜGBAR       : e.agentsCount,
                BESETZT         : e.totalBusy,
                FREI            : e.agentsVacant,
                WARTESCHLANGE   : e.totalWaiting + ' / ' + Math.round(e.avgWaitTime/1000) + ' secs',
                English         : e.agentsBusy[0].count +  ' / ' + e.callsWaiting[0].count,
                German          : e.agentsBusy[1].count +  ' / ' + e.callsWaiting[1].count,
                French          : e.agentsBusy[2].count +  ' / ' + e.callsWaiting[2].count,
                Italian         : e.agentsBusy[3].count +  ' / ' + e.callsWaiting[3].count,
                Spanish         : e.agentsBusy[4].count +  ' / ' + e.callsWaiting[4].count,
                Russian         : e.agentsBusy[5].count +  ' / ' + e.callsWaiting[5].count,
                Swedish         : e.agentsBusy[6].count +  ' / ' + e.callsWaiting[6].count
            }

        });

    };
    function chart(e) {
        var i = 0;
        e.forEach(function(err, info){
            setData(i,e[i]);
            i +=1;
        });
    };

    var canvas, ctx;
    var clockRadius = 65;

// draw functions :
    function clear() { // clear canvas function
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    function drawScene() { // main drawScene function
        clear(); // clear canvas

        // get current time
        var date = new Date();
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var seconds = date.getSeconds()+1; // Der Zeit voraus!
        hours = hours > 12 ? hours - 12 : hours;
        var hour = hours + minutes / 60;
        var minute = minutes + seconds / 60;

        // save current context
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.beginPath();

        // draw numbers
        ctx.font = '12px Arial';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (var n = 1; n <= 12; n++) {
            var theta = (n - 3) * (Math.PI * 2) / 12;
            var x = clockRadius * Math.cos(theta);
            var y = clockRadius * Math.sin(theta);
            ctx.fillText(n, x, y);
        }

        // draw hour
        ctx.save();
        var theta = (hour - 3) * 2 * Math.PI / 12;
        ctx.rotate(theta);
        ctx.beginPath();
        ctx.moveTo(-15, -5);
        ctx.lineTo(-15, 5);
        ctx.lineTo(clockRadius * 0.5, 1);
        ctx.lineTo(clockRadius * 0.5, -1);
        ctx.fill();
        ctx.restore();

        // draw minute
        ctx.save();
        var theta = (minute - 15) * 2 * Math.PI / 60;
        ctx.rotate(theta);
        ctx.beginPath();
        ctx.moveTo(-15, -4);
        ctx.lineTo(-15, 4);
        ctx.lineTo(clockRadius * 0.8, 1);
        ctx.lineTo(clockRadius * 0.8, -1);
        ctx.fill();
        ctx.restore();

        // draw second
        ctx.save();
        var theta = (seconds - 15) * 2 * Math.PI / 60;
        ctx.rotate(theta);
        ctx.beginPath();
        ctx.moveTo(-15, -3);
        ctx.lineTo(-15, 3);
        ctx.lineTo(clockRadius * 0.9, 1);
        ctx.lineTo(clockRadius * 0.9, -1);
        ctx.fillStyle = '#400';
        ctx.fill();
        ctx.restore();

        ctx.restore();
    }

// initialization
    $(function(){
        canvas = document.getElementById('canvas');
        ctx = canvas.getContext('2d');


        setInterval(drawScene, 1000); // loop drawScene
    });

});