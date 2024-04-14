var t=require("eventemitter3");function n(t){return t&&"object"==typeof t&&"default"in t?t:{default:t}}var e=/*#__PURE__*/n(require("isomorphic-ws"));function i(t,n){t.prototype=Object.create(n.prototype),t.prototype.constructor=t,o(t,n)}function o(t,n){return o=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(t,n){return t.__proto__=n,t},o(t,n)}var a=/*#__PURE__*/function(t){function n(n){var i;(i=t.call(this)||this).ws=void 0,i.pingTimeout=null,i.pingInterval=null,i.wasDisconnected=!1,i.pingIntervalTime=5e3;var o=(n.customEndpoint||"wss://api.retellai.com/audio-websocket/")+n.callId;return n.enableUpdate&&(o+="?enable_update=true"),i.ws=new e.default(o),i.ws.binaryType="arraybuffer",i.ws.onopen=function(){i.emit("open"),i.startPingPong()},i.ws.onmessage=function(t){if("string"==typeof t.data)if("pong"===t.data)i.wasDisconnected&&(i.emit("reconnect"),i.wasDisconnected=!1),i.adjustPingFrequency(5e3);else if("clear"===t.data)i.emit("clear");else try{var n=JSON.parse(t.data);i.emit("update",n)}catch(t){console.log(t)}else if(t.data instanceof ArrayBuffer){var e=new Uint8Array(t.data);i.emit("audio",e)}else console.log("error","Got unknown message from server.")},i.ws.onclose=function(t){i.stopPingPong(),i.emit("close",t.code,t.reason)},i.ws.onerror=function(t){i.stopPingPong(),i.emit("error",t.error)},i}i(n,t);var o=n.prototype;return o.startPingPong=function(){var t=this;this.pingInterval=setInterval(function(){return t.sendPing()},this.pingIntervalTime),this.resetPingTimeout()},o.sendPing=function(){this.ws.readyState===e.default.OPEN&&this.ws.send("ping")},o.adjustPingFrequency=function(t){this.pingIntervalTime!==t&&(null!=this.pingInterval&&clearInterval(this.pingInterval),this.pingIntervalTime=t,this.startPingPong())},o.resetPingTimeout=function(){var t=this;null!=this.pingTimeout&&clearTimeout(this.pingTimeout),this.pingTimeout=setTimeout(function(){5e3===t.pingIntervalTime&&(t.adjustPingFrequency(1e3),t.pingTimeout=setTimeout(function(){t.emit("disconnect"),t.wasDisconnected=!0},3e3))},this.pingIntervalTime)},o.stopPingPong=function(){null!=this.pingInterval&&clearInterval(this.pingInterval),null!=this.pingTimeout&&clearTimeout(this.pingTimeout)},o.send=function(t){1===this.ws.readyState&&this.ws.send(t)},o.close=function(){this.ws.close()},n}(t.EventEmitter);exports.RetellWebClient=/*#__PURE__*/function(t){function n(n){var e;return(e=t.call(this)||this).liveClient=void 0,e.audioContext=void 0,e.isCalling=!1,e.stream=void 0,e.audioNode=void 0,e.customEndpoint=void 0,e.captureNode=null,n&&(e.customEndpoint=n),e}i(n,t);var e=n.prototype;return e.startConversation=function(t){try{var n=this,e=function(e,i){try{var o=Promise.resolve(n.setupAudioPlayback(t.sampleRate,t.customStream)).then(function(){n.liveClient=new a({callId:t.callId,enableUpdate:t.enableUpdate,customEndpoint:n.customEndpoint}),n.handleAudioEvents(),n.isCalling=!0})}catch(t){return i(t)}return o&&o.then?o.then(void 0,i):o}(0,function(t){n.emit("error",t.message)});return Promise.resolve(e&&e.then?e.then(function(){}):void 0)}catch(t){return Promise.reject(t)}},e.stopConversation=function(){var t,n,e,i;this.isCalling=!1,null==(t=this.liveClient)||t.close(),null==(n=this.audioContext)||n.suspend(),null==(e=this.audioContext)||e.close(),this.audioNode&&this.audioNode.disconnect(),this.captureNode&&this.captureNode.disconnect(),this.liveClient=null,null==(i=this.stream)||i.getTracks().forEach(function(t){return t.stop()}),this.audioContext=null,this.stream=null},e.handleAudioEvents=function(){var t=this;this.liveClient.on("open",function(){return t.emit("conversationStarted")}),this.liveClient.on("disconnect",function(){return t.emit("disconnect")}),this.liveClient.on("reconnect",function(){return t.emit("reconnect")}),this.liveClient.on("error",function(n){t.emit("error",n),t.isCalling&&t.stopConversation()}),this.liveClient.on("close",function(n,e){t.isCalling&&t.stopConversation(),t.emit("conversationEnded",{code:n,reason:e})}),this.liveClient.on("update",function(n){return t.emit("update",n)}),this.liveClient.on("clear",function(){return t.emit("clear")})},e.setupAudioPlayback=function(t,n){try{var e=function(t){i.stream=t;var n=function(){if(i.isAudioWorkletSupported()){console.log("Setting up Audio Worklet");var t=new Blob(['\nclass captureAndPlaybackProcessor extends AudioWorkletProcessor {\n    audioData = [];\n    index = 0;\n    isTalking = false;\n  \n    constructor() {\n      super();\n      //set listener to receive audio data, data is float32 array.\n      this.port.onmessage = (e) => {\n        if (e.data === "clear") {\n          // Clear all buffer.\n          this.audioData = [];\n          this.index = 0;\n          if (this.isTalking) {\n            this.isTalking = false;\n            this.port.postMessage("agent_stop_talking");\n          }\n        } else if (e.data.length > 0) {\n          this.audioData.push(this.convertUint8ToFloat32(e.data));\n          if (!this.isTalking) {\n            this.isTalking = true;\n            this.port.postMessage("agent_start_talking");\n          }\n        }\n      };\n    }\n  \n    convertUint8ToFloat32(array) {\n      const targetArray = new Float32Array(array.byteLength / 2);\n    \n      // A DataView is used to read our 16-bit little-endian samples out of the Uint8Array buffer\n      const sourceDataView = new DataView(array.buffer);\n    \n      // Loop through, get values, and divide by 32,768\n      for (let i = 0; i < targetArray.length; i++) {\n        targetArray[i] = sourceDataView.getInt16(i * 2, true) / Math.pow(2, 16 - 1);\n      }\n      return targetArray;\n    }\n  \n    convertFloat32ToUint8(array) {\n      const buffer = new ArrayBuffer(array.length * 2);\n      const view = new DataView(buffer);\n    \n      for (let i = 0; i < array.length; i++) {\n        const value = array[i] * 32768;\n        view.setInt16(i * 2, value, true); // true for little-endian\n      }\n    \n      return new Uint8Array(buffer);\n    }\n  \n    process(inputs, outputs, parameters) {\n      // Capture\n      const input = inputs[0];\n      const inputChannel1 = input[0];\n      const inputChannel2 = input[1];\n      this.port.postMessage(["capture", this.convertFloat32ToUint8(inputChannel1)]);\n  \n      // Playback\n      const output = outputs[0];\n      const outputChannel1 = output[0];\n      const outputChannel2 = output[1];\n      // start playback.\n      for (let i = 0; i < outputChannel1.length; ++i) {\n        if (this.audioData.length > 0) {\n          outputChannel1[i] = this.audioData[0][this.index];\n          outputChannel2[i] = this.audioData[0][this.index];\n          this.index++;\n          if (this.index == this.audioData[0].length) {\n            this.audioData.shift();\n            this.index = 0;\n          }\n        } else {\n          outputChannel1[i] = 0;\n          outputChannel2[i] = 0;\n        }\n      }\n\n      this.port.postMessage(["playback", this.convertFloat32ToUint8(outputChannel1)]);\n      if (!this.audioData.length && this.isTalking) {\n        this.isTalking = false;\n        this.port.postMessage("agent_stop_talking");\n      }\n  \n      return true;\n    }\n  }\n  \n  registerProcessor(\n    "capture-and-playback-processor",\n    captureAndPlaybackProcessor,\n  );\n'],{type:"application/javascript"}),n=URL.createObjectURL(t);return Promise.resolve(i.audioContext.audioWorklet.addModule(n)).then(function(){i.audioNode=new AudioWorkletNode(i.audioContext,"capture-and-playback-processor"),i.audioContext.createMediaStreamSource(i.stream).connect(i.audioNode),i.audioNode.connect(i.audioContext.createGain())})}console.log("Fallback to ScriptProcessorNode");var e=i.audioContext.createMediaStreamSource(i.stream);i.captureNode=i.audioContext.createScriptProcessor(2048,1,1),e.connect(i.captureNode),i.captureNode.connect(i.audioContext.createGain())}();if(n&&n.then)return n.then(function(){})},i=this;return i.audioContext=new AudioContext({sampleRate:t}),Promise.resolve(n?e(n):Promise.resolve(navigator.mediaDevices.getUserMedia({audio:{sampleRate:t,echoCancellation:!0,noiseSuppression:!0,channelCount:1}})).then(e))}catch(t){return Promise.reject(t)}},e.isAudioWorkletSupported=function(){return/Chrome/.test(navigator.userAgent)&&/Google Inc/.test(navigator.vendor)},e.playAudio=function(t){console.log("Playback disabled",t)},n}(t.EventEmitter);
