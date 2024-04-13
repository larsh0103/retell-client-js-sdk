!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports,require("eventemitter3"),require("isomorphic-ws")):"function"==typeof define&&define.amd?define(["exports","eventemitter3","isomorphic-ws"],e):e((t||self).retellClientJsSdk={},t.eventemitter3,t.isomorphicWs)}(this,function(t,e,n){function i(t){return t&&"object"==typeof t&&"default"in t?t:{default:t}}var o=/*#__PURE__*/i(n);function a(t,e){t.prototype=Object.create(e.prototype),t.prototype.constructor=t,r(t,e)}function r(t,e){return r=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(t,e){return t.__proto__=e,t},r(t,e)}var s=/*#__PURE__*/function(t){function e(e){var n;(n=t.call(this)||this).ws=void 0,n.pingTimeout=null,n.pingInterval=null,n.wasDisconnected=!1,n.pingIntervalTime=5e3;var i=(e.customEndpoint||"wss://api.retellai.com/audio-websocket/")+e.callId;return e.enableUpdate&&(i+="?enable_update=true"),n.ws=new o.default(i),n.ws.binaryType="arraybuffer",n.ws.onopen=function(){n.emit("open"),n.startPingPong()},n.ws.onmessage=function(t){if("string"==typeof t.data)if("pong"===t.data)n.wasDisconnected&&(n.emit("reconnect"),n.wasDisconnected=!1),n.adjustPingFrequency(5e3);else if("clear"===t.data)n.emit("clear");else try{var e=JSON.parse(t.data);n.emit("update",e)}catch(t){console.log(t)}else if(t.data instanceof ArrayBuffer){var i=new Uint8Array(t.data);n.emit("audio",i)}else console.log("error","Got unknown message from server.")},n.ws.onclose=function(t){n.stopPingPong(),n.emit("close",t.code,t.reason)},n.ws.onerror=function(t){n.stopPingPong(),n.emit("error",t.error)},n}a(e,t);var n=e.prototype;return n.startPingPong=function(){var t=this;this.pingInterval=setInterval(function(){return t.sendPing()},this.pingIntervalTime),this.resetPingTimeout()},n.sendPing=function(){this.ws.readyState===o.default.OPEN&&this.ws.send("ping")},n.adjustPingFrequency=function(t){this.pingIntervalTime!==t&&(null!=this.pingInterval&&clearInterval(this.pingInterval),this.pingIntervalTime=t,this.startPingPong())},n.resetPingTimeout=function(){var t=this;null!=this.pingTimeout&&clearTimeout(this.pingTimeout),this.pingTimeout=setTimeout(function(){5e3===t.pingIntervalTime&&(t.adjustPingFrequency(1e3),t.pingTimeout=setTimeout(function(){t.emit("disconnect"),t.wasDisconnected=!0},3e3))},this.pingIntervalTime)},n.stopPingPong=function(){null!=this.pingInterval&&clearInterval(this.pingInterval),null!=this.pingTimeout&&clearTimeout(this.pingTimeout)},n.send=function(t){1===this.ws.readyState&&this.ws.send(t)},n.close=function(){this.ws.close()},e}(e.EventEmitter);function u(t){for(var e=new ArrayBuffer(2*t.length),n=new DataView(e),i=0;i<t.length;i++)n.setInt16(2*i,32768*t[i],!0);return new Uint8Array(e)}function l(t,e){try{var n=t()}catch(t){return e(t)}return n&&n.then?n.then(void 0,e):n}t.RetellWebClient=/*#__PURE__*/function(t){function e(e){var n;return(n=t.call(this)||this).liveClient=void 0,n.audioContext=void 0,n.isCalling=!1,n.stream=void 0,n.audioNode=void 0,n.customEndpoint=void 0,n.captureNode=null,n.audioData=[],n.audioDataIndex=0,n.isTalking=!1,e&&(n.customEndpoint=e),n}a(e,t);var n=e.prototype;return n.startConversation=function(t){try{var e=this,n=l(function(){return Promise.resolve(e.setupAudioPlayback(t.sampleRate,t.customStream)).then(function(){e.liveClient=new s({callId:t.callId,enableUpdate:t.enableUpdate,customEndpoint:e.customEndpoint}),e.handleAudioEvents(),e.isCalling=!0})},function(t){e.emit("error",t.message)});return Promise.resolve(n&&n.then?n.then(function(){}):void 0)}catch(t){return Promise.reject(t)}},n.stopConversation=function(){var t,e,n,i,o;this.isCalling=!1,null==(t=this.liveClient)||t.close(),null==(e=this.audioContext)||e.suspend(),null==(n=this.audioContext)||n.close(),this.isAudioWorkletSupported()?(null==(o=this.audioNode)||o.disconnect(),this.audioNode=null):this.captureNode&&(this.captureNode.disconnect(),this.captureNode.onaudioprocess=null,this.captureNode=null,this.audioData=[],this.audioDataIndex=0),this.liveClient=null,null==(i=this.stream)||i.getTracks().forEach(function(t){return t.stop()}),this.audioContext=null,this.stream=null},n.handleAudioEvents=function(){var t=this;this.liveClient.on("open",function(){t.emit("conversationStarted")}),this.liveClient.on("audio",function(e){t.playAudio(e)}),this.liveClient.on("disconnect",function(){t.emit("disconnect")}),this.liveClient.on("reconnect",function(){t.emit("reconnect")}),this.liveClient.on("error",function(e){t.emit("error",e),t.isCalling&&t.stopConversation()}),this.liveClient.on("close",function(e,n){t.isCalling&&t.stopConversation(),t.emit("conversationEnded",{code:e,reason:n})}),this.liveClient.on("update",function(e){t.emit("update",e)}),this.liveClient.on("clear",function(){t.isAudioWorkletSupported()?t.audioNode.port.postMessage("clear"):(t.audioData=[],t.audioDataIndex=0,t.isTalking&&(t.isTalking=!1,t.emit("agentStopTalking")))})},n.setupAudioPlayback=function(t,e){try{var n=function(t){var e=function(){if(i.isAudioWorkletSupported()){console.log("Audio worklet starting"),i.audioContext.resume();var t=new Blob(['\nclass captureAndPlaybackProcessor extends AudioWorkletProcessor {\n    audioData = [];\n    index = 0;\n    isTalking = false;\n  \n    constructor() {\n      super();\n      //set listener to receive audio data, data is float32 array.\n      this.port.onmessage = (e) => {\n        if (e.data === "clear") {\n          // Clear all buffer.\n          this.audioData = [];\n          this.index = 0;\n          if (this.isTalking) {\n            this.isTalking = false;\n            this.port.postMessage("agent_stop_talking");\n          }\n        } else if (e.data.length > 0) {\n          this.audioData.push(this.convertUint8ToFloat32(e.data));\n          if (!this.isTalking) {\n            this.isTalking = true;\n            this.port.postMessage("agent_start_talking");\n          }\n        }\n      };\n    }\n  \n    convertUint8ToFloat32(array) {\n      const targetArray = new Float32Array(array.byteLength / 2);\n    \n      // A DataView is used to read our 16-bit little-endian samples out of the Uint8Array buffer\n      const sourceDataView = new DataView(array.buffer);\n    \n      // Loop through, get values, and divide by 32,768\n      for (let i = 0; i < targetArray.length; i++) {\n        targetArray[i] = sourceDataView.getInt16(i * 2, true) / Math.pow(2, 16 - 1);\n      }\n      return targetArray;\n    }\n  \n    convertFloat32ToUint8(array) {\n      const buffer = new ArrayBuffer(array.length * 2);\n      const view = new DataView(buffer);\n    \n      for (let i = 0; i < array.length; i++) {\n        const value = array[i] * 32768;\n        view.setInt16(i * 2, value, true); // true for little-endian\n      }\n    \n      return new Uint8Array(buffer);\n    }\n  \n    process(inputs, outputs, parameters) {\n      // Capture\n      const input = inputs[0];\n      const inputChannel1 = input[0];\n      const inputChannel2 = input[1];\n      this.port.postMessage(["capture", this.convertFloat32ToUint8(inputChannel1)]);\n  \n      // Playback\n      const output = outputs[0];\n      const outputChannel1 = output[0];\n      const outputChannel2 = output[1];\n      // start playback.\n      for (let i = 0; i < outputChannel1.length; ++i) {\n        if (this.audioData.length > 0) {\n          outputChannel1[i] = this.audioData[0][this.index];\n          outputChannel2[i] = this.audioData[0][this.index];\n          this.index++;\n          if (this.index == this.audioData[0].length) {\n            this.audioData.shift();\n            this.index = 0;\n          }\n        } else {\n          outputChannel1[i] = 0;\n          outputChannel2[i] = 0;\n        }\n      }\n\n      this.port.postMessage(["playback", this.convertFloat32ToUint8(outputChannel1)]);\n      if (!this.audioData.length && this.isTalking) {\n        this.isTalking = false;\n        this.port.postMessage("agent_stop_talking");\n      }\n  \n      return true;\n    }\n  }\n  \n  registerProcessor(\n    "capture-and-playback-processor",\n    captureAndPlaybackProcessor,\n  );\n'],{type:"application/javascript"}),e=URL.createObjectURL(t);return Promise.resolve(i.audioContext.audioWorklet.addModule(e)).then(function(){console.log("Audio worklet loaded"),i.audioNode=new AudioWorkletNode(i.audioContext,"capture-and-playback-processor"),console.log("Audio worklet setup"),i.audioNode.port.onmessage=function(t){var e=t.data;if(Array.isArray(e)){var n,o=e[0];"capture"===o?null==(n=i.liveClient)||n.send(e[1]):"playback"===o&&i.emit("audio",e[1])}else"agent_stop_talking"===e?i.emit("agentStopTalking"):"agent_start_talking"===e&&i.emit("agentStartTalking")},i.audioContext.createMediaStreamSource(i.stream).connect(i.audioNode),i.audioNode.connect(i.audioContext.destination)})}var n=i.audioContext.createMediaStreamSource(i.stream);i.captureNode=i.audioContext.createScriptProcessor(2048,1,1),i.captureNode.onaudioprocess=function(t){if(i.isCalling){var e=u(t.inputBuffer.getChannelData(0));i.liveClient.send(e);for(var n=t.outputBuffer.getChannelData(0),o=0;o<n.length;++o)i.audioData.length>0?(n[o]=i.audioData[0][i.audioDataIndex++],i.audioDataIndex===i.audioData[0].length&&(i.audioData.shift(),i.audioDataIndex=0)):n[o]=0;i.emit("audio",u(n)),!i.audioData.length&&i.isTalking&&(i.isTalking=!1,i.emit("agentStopTalking"))}},n.connect(i.captureNode),i.captureNode.connect(i.audioContext.destination)}();if(e&&e.then)return e.then(function(){})},i=this;i.audioContext=new AudioContext({sampleRate:t});var o=l(function(){function n(t){i.stream=t}return e?n(e):Promise.resolve(navigator.mediaDevices.getUserMedia({audio:{sampleRate:t,echoCancellation:!0,noiseSuppression:!0,channelCount:1}})).then(n)},function(){throw new Error("User didn't give microphone permission")});return Promise.resolve(o&&o.then?o.then(n):n())}catch(t){return Promise.reject(t)}},n.isAudioWorkletSupported=function(){return/Chrome/.test(navigator.userAgent)&&/Google Inc/.test(navigator.vendor)},n.playAudio=function(t){console.log("Audio received but not played automatically");var e=function(t){for(var e=new Float32Array(t.byteLength/2),n=new DataView(t.buffer),i=0;i<e.length;i++)e[i]=n.getInt16(2*i,!0)/Math.pow(2,15);return e}(t);this.audioData.push(e)},e}(e.EventEmitter)});
