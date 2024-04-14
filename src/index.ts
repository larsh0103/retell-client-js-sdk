import {
  AudioWsClient,
  convertFloat32ToUint8,
  convertUint8ToFloat32,
} from "./audioWsClient";
import { EventEmitter } from "eventemitter3";
import { workletCode } from "./audioWorklet";

export interface StartConversationConfig {
  callId: string;
  sampleRate: number;
  customStream?: MediaStream;
  enableUpdate?: boolean;
}

export class RetellWebClient extends EventEmitter {
  private liveClient: AudioWsClient;
  private audioContext: AudioContext;
  private isCalling: boolean = false;
  private stream: MediaStream;

  // Chrome
  private audioNode: AudioWorkletNode;
  private customEndpoint: string;

  // Others
  private captureNode: ScriptProcessorNode | null = null;
  private audioData: Float32Array[] = [];
  private audioDataIndex: number = 0;
  private isTalking: boolean = false;

  constructor(customEndpoint?: string) {
    super();
    if (customEndpoint) {
      this.customEndpoint = customEndpoint;
    }
  }

  public async startConversation(
    startConversationConfig: StartConversationConfig,
  ): Promise<void> {
    try {
      await this.setupAudioPlayback(
        startConversationConfig.sampleRate,
        startConversationConfig.customStream,
      );
      this.liveClient = new AudioWsClient({
        callId: startConversationConfig.callId,
        enableUpdate: startConversationConfig.enableUpdate,
        customEndpoint: this.customEndpoint,
      });
      this.handleAudioEvents();
      this.isCalling = true;
    } catch (err) {
      this.emit("error", (err as Error).message);
    }
  }

  public stopConversation(): void {
    this.isCalling = false;
    this.liveClient?.close();
    this.audioContext?.suspend();
    this.audioContext?.close(); // Properly close the audio context to release system audio resources

    if (this.isAudioWorkletSupported()) {
      this.audioNode?.disconnect();
      this.audioNode = null; // Prevent memory leak by detaching the event handler
    } else {
      if (this.captureNode) {
        this.captureNode.disconnect();
        this.captureNode.onaudioprocess = null; // Prevent memory leak by detaching the event handler
        this.captureNode = null;
        this.audioData = [];
        this.audioDataIndex = 0;
      }
    }
    // Release references to allow for garbage collection
    this.liveClient = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.audioContext = null;
    this.stream = null;
  }

  private handleAudioEvents(): void {
    this.liveClient.on("open", () => {
      this.emit("conversationStarted");
    });

    this.liveClient.on("disconnect", () => {
      this.emit("disconnect");
    });

    this.liveClient.on("reconnect", () => {
      this.emit("reconnect");
    });

    this.liveClient.on("error", (error) => {
      this.emit("error", error);
      if (this.isCalling) {
        this.stopConversation();
      }
    });

    this.liveClient.on("close", (code: number, reason: string) => {
      if (this.isCalling) {
        this.stopConversation();
      }
      this.emit("conversationEnded", { code, reason });
    });

    this.liveClient.on("update", (update) => {
      this.emit("update", update);
    });

    this.liveClient.on("clear", () => {
      if (this.isAudioWorkletSupported()) {
        this.audioNode.port.postMessage("clear");
      } else {
        this.audioData = [];
        this.audioDataIndex = 0;
        if (this.isTalking) {
          this.isTalking = false;
          this.emit("agentStopTalking");
        }
      }
    });
  }

  private async setupAudioPlayback(
    sampleRate: number,
    customStream?: MediaStream,
  ): Promise<void> {
    this.audioContext = new AudioContext({ sampleRate: sampleRate });
    try {
      this.stream =
        customStream ||
        (await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: sampleRate,
            echoCancellation: true,
            noiseSuppression: true,
            channelCount: 1,
          },
        }));
    } catch (error) {
      throw new Error("User didn't give microphone permission");
    }

    if (this.isAudioWorkletSupported()) {
      console.log("Audio worklet starting");
      this.audioContext.resume();
      const blob = new Blob([workletCode], { type: "application/javascript" });
      const blobURL = URL.createObjectURL(blob);
      await this.audioContext.audioWorklet.addModule(blobURL);
      console.log("Audio worklet loaded");
      this.audioNode = new AudioWorkletNode(
        this.audioContext,
        "capture-and-playback-processor",
      );

      const source = this.audioContext.createMediaStreamSource(this.stream);
      source.connect(this.audioNode);
      // Ensure no audio is connected to the audio output
    } else {
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.captureNode = this.audioContext.createScriptProcessor(2048, 1, 1);
      this.captureNode.onaudioprocess = (audioProcessingEvent: AudioProcessingEvent) => {
        const outputBuffer = audioProcessingEvent.outputBuffer;
        // Silencing the output buffer
        for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
          const outputData = outputBuffer.getChannelData(channel);
          for (let sample = 0; sample < outputData.length; sample++) {
            outputData[sample] = 0; // Set output samples to zero
          }
        }
      };
      source.connect(this.captureNode);
      this.captureNode.connect(this.audioContext.destination);  // Optionally disconnect this line if no output is desired at all
    }
  }

  private isAudioWorkletSupported(): boolean {
    return (
      /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
    );
  }

  private playAudio(audio: Uint8Array): void {
    // This function now does nothing or just logs the audio data.
    console.log("Playback disabled", audio);
  }
}