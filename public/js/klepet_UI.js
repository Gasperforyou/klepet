
function divElementEnostavniTekst(sporocilo) {
  var jeSmesko = sporocilo.indexOf('http://sandbox.lavbic.net/teaching/OIS/gradivo/') > -1;
  var soSlike = sporocilo.indexOf('Smiley face') >-1;
  var jeVideo = sporocilo.indexOf('https://www.youtube.com/embed/') >-1;
  if (jeSmesko || jeVideo || soSlike) {
    sporocilo = sporocilo.replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace(/&lt;img/g, '<img').replace(/png\' \/&gt;/g, 'png\' />').replace(/jpg\' \/&gt;/g, 'jpg\' />').replace(/gif\' \/&gt;/g, 'gif\' />');
    sporocilo = sporocilo.replace(/&lt;iframe/g, '<iframe').replace(/allowfullscreen&gt;&lt;\/iframe&gt;/g, 'allowfullscreen></iframe>');
    return $('<div style="font-weight: bold"></div>').html(sporocilo);
  } else{
    return $('<div style="font-weight: bold;"></div>').text(sporocilo);
  }
}

function divElementHtmlTekst(sporocilo) {
  return $('<div></div>').html('<i>' + sporocilo + '</i>');
}

function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  sporocilo = dodajSlike(sporocilo);
  sporocilo = dodajSmeske(sporocilo);
  
  sporocilo = dodajVideoposnetke(sporocilo);
  var sistemskoSporocilo;

  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
    }
  } else {
    sporocilo = filtirirajVulgarneBesede(sporocilo);
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    $('#sporocila').append(divElementEnostavniTekst(sporocilo));
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  }

  $('#poslji-sporocilo').val('');
}

var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "";

var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});

function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
}

$(document).ready(function() {
  var klepetApp = new Klepet(socket);

  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });

  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });

  socket.on('sporocilo', function (sporocilo) {
    var novElement = divElementEnostavniTekst(sporocilo.besedilo);
    $('#sporocila').append(novElement);
  });
  
  socket.on('dregljaj', function(dregljaj){
    if(dregljaj.dregljaj){
      var element = $('#vsebina');
      element.jrumble();
      element.trigger('startRumble');
      setTimeout(function(){
        element.trigger('stopRumble');
        dregljaj.dregljaj = false;
      }, 1500);
    }
  });
  
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal));
      }
    }

    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });

  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    for (var i=0; i < uporabniki.length; i++) {
      $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]));
    }
    
    $('#seznam-uporabnikov div').click(function() {
      var gost = $(this).text();
      $('#poslji-sporocilo').val('/zasebno "'+ gost+'"');
      $('#poslji-sporocilo').focus();
    });
  });

  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
  
  
});

function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  }
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.replace(smesko,
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}

function dodajSlike(vbesedilo){
  var dobre = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~:/?#[]@!$&'()*+,;=";
  
  var regExHttp = new RegExp("(http://|https://)",  "g");
  var regExHttpNaslednji = new RegExp("(http://|https://)",  "g");
  var regExKonec = new RegExp("(\\.jpg|\\.png|\\.gif)",  "g");
  
  regExHttpNaslednji.test(vbesedilo);
  regExHttpNaslednji.test(vbesedilo);
  
  var pozZac = [];
  var pozKon = [];
  while(regExHttp.test(vbesedilo) == true){
      var prvi = regExHttp.lastIndex;
      
      if(regExKonec.test(vbesedilo) == false) break;
      var zadnji = regExKonec.lastIndex;
      
      var naslednji = regExHttpNaslednji.lastIndex;
      if(prvi<naslednji && naslednji<zadnji){
        regExHttpNaslednji.test(vbesedilo);
        continue;
      }
      var niUrl = false;
      for(var i = prvi; i<zadnji; i++){
        if(dobre.indexOf(vbesedilo.charAt(i))==-1){
          niUrl=true;
          break;
        }
      }
      if(niUrl) continue;
      pozZac.push(prvi);
      pozKon.push(zadnji);
      
      regExHttpNaslednji.test(vbesedilo);
      
  }
  for(var i = pozZac.length-1;i>=0 ; i--){
    var odmik = 0;
    if(vbesedilo.charAt(pozZac[i]-4) == 's'){
      odmik = 8;
    } else {
      odmik = 7;
    }
    vbesedilo += vbesedilo.substring(pozZac[i]-odmik, pozKon[i]).replace("http", "<img  alt='Smiley face' style = 'margin-left: 20px;' width='200'  src='http")+"' />";
  }
  return vbesedilo;
}

function dodajVideoposnetke(vbesedilo){
  var obdelaj = vbesedilo;
  var pozicije = [];
  while(obdelaj.indexOf("https://www.youtube.com/watch?v=")>-1){
    var pozicija =vbesedilo.indexOf("https://www.youtube.com/watch?v=");
    pozicije.push(pozicija);
    obdelaj = obdelaj.substring(pozicija+11+32);
  }
  for (var i = 0; i<pozicije.length; i++){
    vbesedilo += vbesedilo.substring(pozicija, pozicija+11+32).replace("https://www.youtube.com/watch?v=", "<iframe width = '200' height = '150' style = 'margin-left: 20px' src='https://www.youtube.com/embed/")+"' allowfullscreen></iframe>";
  }
  return vbesedilo;
}

