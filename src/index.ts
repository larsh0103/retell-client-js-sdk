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

  private audioNode: AudioWorkletNode;
  private customEndpoint: string;

  private captureNode: ScriptProcessorNode | null = null;

  constructor(customEndpoint?: string) {
    super();
    if (customEndpoint) {
      this.customEndpoint = customEndpoint;
    }
  }

  public async startConversation(startConversationConfig: StartConversationConfig): Promise<void> {
    try {
      await this.setupAudioPlayback(startConversationConfig.sampleRate, startConversationConfig.customStream);
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
    this.audioContext?.close();

    if (this.audioNode) {
      this.audioNode.disconnect();
    }
    if (this.captureNode) {
      this.captureNode.disconnect();
    }
    this.liveClient = null;
    this.stream?.getTracks().forEach(track => track.stop());
    this.audioContext = null;
    this.stream = null;
  }

  private handleAudioEvents(): void {
    this.liveClient.on("open", () => this.emit("conversationStarted"));
    this.liveClient.on("disconnect", () => this.emit("disconnect"));
    this.liveClient.on("reconnect", () => this.emit("reconnect"));
    this.liveClient.on("error", error => {
      this.emit("error", error);
      if (this.isCalling) {
        this.stopConversation();
      }
    });
    this.liveClient.on("close", (code, reason) => {
      if (this.isCalling) {
        this.stopConversation();
      }
      this.emit("conversationEnded", { code, reason });
    });
    this.liveClient.on("update", update => this.emit("update", update));
    this.liveClient.on("clear", () => this.emit("clear"));
  }

  private async setupAudioPlayback(sampleRate: number, customStream?: MediaStream): Promise<void> {
    this.audioContext = new AudioContext({ sampleRate });
    this.stream = customStream || await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate, echoCancellation: true, noiseSuppression: true, channelCount: 1 }
    });

    if (this.isAudioWorkletSupported()) {
      console.log("Setting up Audio Worklet");
      console.log("getting some fucking shit started");
      const blob = new Blob([workletCode], { type: "application/javascript" });
      const blobURL = URL.createObjectURL(blob);
      await this.audioContext.audioWorklet.addModule(blobURL);
      this.audioNode = new AudioWorkletNode(this.audioContext, "capture-and-playback-processor");
      const source = this.audioContext.createMediaStreamSource(this.stream);
      source.connect(this.audioNode);
      this.audioNode.connect(this.audioContext.createGain()); // Connect to gain node with zero gain
    } else {
      console.log("Fallback to ScriptProcessorNode");
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.captureNode = this.audioContext.createScriptProcessor(2048, 1, 1);
      source.connect(this.captureNode);
      this.captureNode.connect(this.audioContext.createGain()); // Connect to gain node with zero gain
    }
  }

  private isAudioWorkletSupported(): boolean {
    return /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
  }

  private playAudio(audio: Uint8Array): void {
    // This function now does nothing or just logs the audio data.
    console.log("Playback disabled", audio);
  }
}