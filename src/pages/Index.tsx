import { useState, useRef, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useWhop } from "@/contexts/WhopContext";
import Navigation from "@/components/Navigation";
import { useApiKey } from "@/contexts/ApiKeyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Video, Image, Music, Upload, FileAudio, X, Zap, Lightbulb, Play, Camera, Headphones, Sparkles, ArrowRight, CheckCircle2, AlertCircle, Plus, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { stylesSupabase } from "@/integrations/supabase/stylesClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StyleManagement } from "@/components/StyleManagement";
import { ensureBucket } from "@/lib/storage";
const Index = () => {
  const { isLoaded, isCheckingAccess, hasAccess } = useWhop();

  if (!isLoaded || isCheckingAccess) {
    return <div className="min-h-screen bg-background"><Navigation /><div className="container mx-auto px-4 py-8">Checking access...</div></div>;
  }

  if (!hasAccess) {
    return <Navigate to="/home" replace />;
  }
  const [videoType, setVideoType] = useState<'clips' | 'images'>('clips');
  const [contentLinks, setContentLinks] = useState("");
  const [musicLink, setMusicLink] = useState("");
  const [subtitleStyleSelected, setSubtitleStyleSelected] = useState(false);
  const [videoDuration, setVideoDuration] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedAudio, setUploadedAudio] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [styleManagementOpen, setStyleManagementOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<string>("");
  const [availablePersons, setAvailablePersons] = useState<{ displayName: string; dbValue: string }[]>([]);
  const [stylesBucket, setStylesBucket] = useState<string>((import.meta as any)?.env?.VITE_STYLES_BUCKET || 'clips');
  const {
    apiKey,
    hasApiKey
  } = useApiKey();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    toast
  } = useToast();
  const shuffleArray = (array: string[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  // Fetch available persons/styles from Supabase 'clips' bucket
  const fetchPersons = async () => {
    try {
      let foldersRes = await stylesSupabase.storage
        .from(stylesBucket)
        .list('', {
          limit: 100,
          offset: 0
        });

      if (foldersRes.error && /Bucket not found/i.test(foldersRes.error.message)) {
        const created = await ensureBucket(stylesBucket, true);
        if (created) {
          foldersRes = await stylesSupabase.storage
            .from(stylesBucket)
            .list('', { limit: 100, offset: 0 });
        } else {
          setStylesBucket('audio-files');
          await ensureBucket('audio-files', true);
          foldersRes = await stylesSupabase.storage
            .from('audio-files')
            .list('', { limit: 100, offset: 0 });
        }
      }

      const { data: folders, error: foldersError } = foldersRes;

      if (foldersError) {
        console.error('Error fetching folders:', foldersError);
        return;
      }

      const styleFolders = folders?.filter(item => 
        item.name !== 'audio' && item.metadata === null
      ) || [];

      const personMappings: { displayName: string; dbValue: string }[] = [];
      
      for (const folder of styleFolders) {
        const displayName = folder.name;
        let folderList = await stylesSupabase.storage
          .from(stylesBucket)
          .list(folder.name, {
            limit: 100,
            offset: 0
          });
        if (folderList.error && /Bucket not found/i.test(folderList.error.message)) {
          const created = await ensureBucket(stylesBucket, true);
          if (created) {
            folderList = await stylesSupabase.storage
              .from(stylesBucket)
              .list(folder.name, { limit: 100, offset: 0 });
          } else {
            setStylesBucket('audio-files');
            await ensureBucket('audio-files', true);
            folderList = await stylesSupabase.storage
              .from('audio-files')
              .list(folder.name, { limit: 100, offset: 0 });
          }
        }
        const { data: folderFiles, error: folderError } = folderList;

        if (folderError) {
          console.error('Error fetching folder files:', folderError);
          continue;
        }

        const videoFiles = folderFiles?.filter(file => 
          file.metadata && file.name.includes('.')
        ) || [];

        let dbValue = displayName.trim().split(' ').pop() || displayName;
        
        if (videoFiles.length > 0) {
          const { data } = stylesSupabase.storage
            .from(stylesBucket)
            .getPublicUrl(`${folder.name}/${videoFiles[0].name}`);

          const { data: clipData, error: clipError } = await stylesSupabase
            .from('clips_meta')
            .select('person')
            .eq('url', data.publicUrl)
            .limit(1);

          if (!clipError && clipData && clipData.length > 0) {
            dbValue = clipData[0].person;
          }
        }

        personMappings.push({ displayName, dbValue });
      }

      setAvailablePersons(personMappings);
    } catch (error) {
      console.error('Error fetching persons:', error);
    }
  };

  // Load styles on mount
  useEffect(() => {
    fetchPersons();
  }, []);

  // Helper to get public URLs of clips for a selected style (folder)
  const getStyleClipUrls = async (styleDisplayName: string): Promise<string[]> => {
    try {
      let listRes = await stylesSupabase.storage
        .from(stylesBucket)
        .list(styleDisplayName, { limit: 200, offset: 0 });
      if (listRes.error && /Bucket not found/i.test(listRes.error.message)) {
        const created = await ensureBucket(stylesBucket, true);
        if (created) {
          listRes = await stylesSupabase.storage
            .from(stylesBucket)
            .list(styleDisplayName, { limit: 200, offset: 0 });
        } else {
          setStylesBucket('audio-files');
          await ensureBucket('audio-files', true);
          listRes = await stylesSupabase.storage
            .from('audio-files')
            .list(styleDisplayName, { limit: 200, offset: 0 });
        }
      }
      const { data: folderFiles, error: folderError } = listRes;
      if (folderError) throw folderError;
      const videoFiles = (folderFiles || []).filter(f => f.metadata && f.name.includes('.'));
      const urls: string[] = [];
      for (const f of videoFiles) {
        const { data } = stylesSupabase.storage
          .from(stylesBucket)
          .getPublicUrl(`${styleDisplayName}/${f.name}`);
        urls.push(data.publicUrl);
      }
      return urls;
    } catch (e) {
      console.error('Failed to load style clips:', e);
      toast({ title: 'Style clips error', description: 'Could not load clips for the selected style.', variant: 'destructive' });
      return [];
    }
  };

  const handleAudioUpload = async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast({
        title: "Invalid file",
        description: "Please upload an audio file.",
        variant: "destructive"
      });
      return;
    }
    setIsProcessingAudio(true);
    try {
      const fileName = `audio/audio_${Date.now()}_${file.name}`;
      // Ensure the 'clips' bucket exists (shared with styles)
      await ensureBucket('clips', true);
      const { data, error } = await supabase.storage.from('clips').upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('clips').getPublicUrl(fileName);
      setAudioUrl(urlData.publicUrl);
      setUploadedAudio(file);
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.addEventListener('loadedmetadata', () => {
        const duration = Math.ceil(audio.duration);
        setVideoDuration(duration.toString());
        URL.revokeObjectURL(audio.src);
        toast({
          title: "Audio uploaded",
          description: `Duration: ${duration} seconds`
        });
      });
      audio.addEventListener('error', () => {
        toast({
          title: "Error",
          description: "Could not detect audio duration.",
          variant: "destructive"
        });
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload audio file.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingAudio(false);
    }
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find(file => file.type.startsWith('audio/'));
    if (audioFile) {
      handleAudioUpload(audioFile);
    }
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const generateAndRenderVideo = async () => {
    if (!hasApiKey) {
      toast({
        title: "API Key Required",
        description: "Please set your JSON2Video API key in the navbar.",
        variant: "destructive"
      });
      return;
    }
    if (!uploadedAudio) {
      toast({
        title: "Missing Voiceover",
        description: "Please upload a voiceover file.",
        variant: "destructive"
      });
      return;
    }
    // Build sources from either provided links or selected style (or both)
    const manualUrls = contentLinks.split('\n').map(s => s.trim()).filter(Boolean);
    let styleUrls: string[] = [];
    if (!manualUrls.length && selectedPerson) {
      styleUrls = await getStyleClipUrls(selectedPerson);
    } else if (selectedPerson) {
      // If both provided, include style clips too
      styleUrls = await getStyleClipUrls(selectedPerson);
    }
    const allUrls = [...manualUrls, ...styleUrls];
    if (allUrls.length === 0) {
      toast({
        title: "Missing Content",
        description: "Please add video/image URLs or select a style.",
        variant: "destructive"
      });
      return;
    }
    setIsGenerating(true);
    try {
      // Generate JSON configuration
      const urls = allUrls;
      const shuffledUrls = shuffleArray(urls);
      const duration = parseInt(videoDuration) || 30;
      const durationPerClip = Math.max(1, Math.floor(duration / shuffledUrls.length));
      const usingStyleClips = styleUrls.length > 0;
      const elementType = usingStyleClips ? 'video' : (videoType === 'clips' ? 'video' : 'image');
      const scenes = shuffledUrls.map(url => ({
        elements: [{
          type: elementType as 'video' | 'image',
          src: url.trim(),
          fit: 'cover',
          ...(elementType === 'video' ? {
            scale: {
              width: 1920,
              height: 1080
            },
            pan: 'top',
            'pan-distance': 0.1,
            zoom: 1,
            duration: durationPerClip,
            volume: 0
          } : {
            duration: durationPerClip
          })
        }]
      }));
      const jsonConfig = {
        scenes,
        comment: `${videoType === 'clips' ? 'Video clips' : 'Image'} based generation ${subtitleStyleSelected ? 'with' : 'with no'} subtitles`,
        resolution: "full-hd",
        quality: "high",
        draft: false,
        elements: [...(audioUrl ? [{
          volume: 2,
          duration: duration,
          type: "audio",
          trim: {
            end: duration
          },
          src: audioUrl,
          loop: 0
        }] : []), ...(musicLink ? [{
          volume: 0.5,
          duration: duration,
          type: "audio",
          src: musicLink.trim(),
          loop: 1
        }] : []), ...(subtitleStyleSelected && audioUrl ? [{
          settings: {
            "outline-width": 6,
            "word-color": "#FFFF00",           // Yellow text
            "shadow-offset": 4,
            "font-url": "https://drive.google.com/uc?export=download&id=1g7X2XRKM25IErbIyCBsAWu65O1Hv43Zh",
            "max-words-per-line": 4,
            "shadow-color": "#000000",         // Black shadow
            "style": "classic",
            "font-family": "Roboto",
            "position": "bottom-center",       // Positioned at bottom center
            "outline-color": "#000000",        // Black outline
            "line-color": "#FFFFFF"            // White line color
          },
          model: "default",
          language: "en",
          type: "subtitles",
          src: audioUrl
        }] : [])]
      };

      // Generate video directly
      const {
        data,
        error
      } = await supabase.functions.invoke('json2video-render', {
        body: {
          action: 'render',
          json: jsonConfig,
          apiKey: apiKey.trim()
        }
      });
      if (error) throw error;
      toast({
        title: "Video Generation Started!",
        description: "Redirecting to JSON2Video dashboard to monitor progress..."
      });

      // Redirect to JSON2Video dashboard
      setTimeout(() => {
        window.open('https://json2video.com/dashboard/renders/', '_blank');
      }, 2000);
    } catch (error) {
      console.error('Video generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to start video generation. Please check your settings and try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };
  const urlCount = contentLinks.split('\n').filter(url => url.trim().length > 0).length;
  return <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
            <Card className="border border-[#E0E0E0] shadow-sm bg-card overflow-hidden rounded-2xl">
            
            
            <CardContent className="space-y-8 p-8">
              {/* Video Type Selection */}
              <div className="space-y-6 p-6 bg-muted rounded-xl border border-[#E0E0E0]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#E0E0E0] rounded-lg shadow-sm">
                    <Play className="h-4 w-4 text-[#000000]" />
                  </div>
                  <Label className="text-lg font-semibold text-[#000000]">Choose Content Type</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`group relative flex flex-col items-center gap-4 p-6 rounded-xl border cursor-pointer transition-colors ${videoType === 'clips' ? 'bg-[#E0E0E0] text-[#000000] border-[#E0E0E0]' : 'bg-transparent text-[#6E6E6E] border-[#E0E0E0] hover:bg-[#F2F2F2]'}`} onClick={() => setVideoType('clips')}>
                    <div className={`p-4 rounded-full transition-colors bg-transparent`}>
                      <Video className={`h-6 w-6 ${videoType === 'clips' ? 'text-[#000000]' : 'text-[#6E6E6E]'}`} />
                    </div>
                    <div className="text-center">
                      <h3 className={`text-base ${videoType === 'clips' ? 'font-semibold text-[#000000]' : 'font-normal text-[#6E6E6E]'}`}>Video Clips</h3>
                      <p className={`text-sm mt-1 ${videoType === 'clips' ? 'text-[#000000]' : 'text-[#6E6E6E]'}`}>Use video content with motion</p>
                    </div>
                    {videoType === 'clips' && (
                      <div className="absolute top-3 right-3">
                        <CheckCircle2 className="h-5 w-5 text-[#000000]" />
                      </div>
                    )}
                  </div>
                  <div className={`group relative flex flex-col items-center gap-4 p-6 rounded-xl border cursor-pointer transition-colors ${videoType === 'images' ? 'bg-[#E0E0E0] text-[#000000] border-[#E0E0E0]' : 'bg-transparent text-[#6E6E6E] border-[#E0E0E0] hover:bg-[#F2F2F2]'}`} onClick={() => setVideoType('images')}>
                    <div className={`p-4 rounded-full transition-colors bg-transparent`}>
                      <Image className={`h-6 w-6 ${videoType === 'images' ? 'text-[#000000]' : 'text-[#6E6E6E]'}`} />
                    </div>
                    <div className="text-center">
                      <h3 className={`text-base ${videoType === 'images' ? 'font-semibold text-[#000000]' : 'font-normal text-[#6E6E6E]'}`}>Static Images</h3>
                      <p className={`text-sm mt-1 ${videoType === 'images' ? 'text-[#000000]' : 'text-[#6E6E6E]'}`}>Use still image content</p>
                    </div>
                    {videoType === 'images' && (
                      <div className="absolute top-3 right-3">
                        <CheckCircle2 className="h-5 w-5 text-[#000000]" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Content URLs */}
              <div className="space-y-6 p-6 bg-muted rounded-xl border border-[#E0E0E0]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#E0E0E0] rounded-lg shadow-sm">
                      {videoType === 'clips' ? (
                        <Video className="h-4 w-4 text-[#000000]" />
                      ) : (
                        <Image className="h-4 w-4 text-[#000000]" />
                      )}
                    </div>
                    <div>
                      <Label className="text-lg font-semibold text-foreground">
                        {videoType === 'clips' ? 'Video Clip Links' : 'Image Links'} 
                        <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <p className="text-sm text-[#6E6E6E] mt-1">
                        Paste your {videoType === 'clips' ? 'video' : 'image'} URLs, one per line
                      </p>
                    </div>
                  </div>
                  {urlCount > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full border border-[#E5E7EB]">
                      <CheckCircle2 className="h-4 w-4 text-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        {urlCount} URLs
                      </span>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <Textarea 
                    placeholder={`Example:\nhttps://example.com/${videoType === 'clips' ? 'video1.mp4' : 'image1.jpg'}\nhttps://example.com/${videoType === 'clips' ? 'video2.mp4' : 'image2.jpg'}`}
                    value={contentLinks} 
                    onChange={e => setContentLinks(e.target.value)} 
                    className="min-h-[140px] resize-none bg-card border-[#E0E0E0] focus:border-[#000000] transition-colors" 
                  />
                  {!contentLinks.trim() && (
                    <div className="absolute top-3 right-3">
                      <AlertCircle className="h-5 w-5 text-[#6B6F76]" />
                    </div>
                  )}
                </div>
              </div>

              {/* Style Selection (moved after Links) */}
              <div className="space-y-6 p-6 bg-muted rounded-xl border border-[#E0E0E0]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#E0E0E0] rounded-lg shadow-sm">
                    <Headphones className="h-4 w-4 text-[#000000]" />
                  </div>
                  <Label className="text-lg font-semibold text-[#000000]">Choose Style</Label>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#000000]">Style</Label>
                  <Select value={selectedPerson} onValueChange={setSelectedPerson}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select a style" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePersons.map((person) => (
                        <SelectItem key={person.dbValue} value={person.displayName}>
                          {person.displayName}
                        </SelectItem>
                      ))}
                      <div className="border-t mt-2 pt-2 space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start gap-2"
                          onClick={() => (window.location.href = '/add-style')}
                        >
                          <Plus className="h-4 w-4" />
                          Add New Style
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start gap-2"
                          onClick={() => setStyleManagementOpen(true)}
                        >
                          <Settings className="h-4 w-4" />
                          Manage Styles
                        </Button>
                      </div>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Audio Upload */}
              <div className="space-y-6 p-6 bg-muted rounded-xl border border-[#E5E7EB]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#E0E0E0] rounded-lg shadow-sm">
                    <Headphones className="h-4 w-4 text-[#000000]" />
                  </div>
                  <div>
                    <Label className="text-lg font-semibold text-[#000000]">
                      Upload Voiceover <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <p className="text-sm text-[#6E6E6E] mt-1">
                      Add your audio narration or voiceover file
                    </p>
                  </div>
                </div>
                
                        <div className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer overflow-hidden ${isDragOver ? 'border-[#E0E0E0] bg-[#F2F2F2]' : 'border-[#E0E0E0]'} ${uploadedAudio ? 'bg-[#F2F2F2]' : 'bg-card hover:bg-[#F2F2F2]'}`} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={() => !uploadedAudio && fileInputRef.current?.click()}>
                  {uploadedAudio ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-3">
                        <div className="p-3 bg-[#E0E0E0] rounded-full shadow-sm">
                          <FileAudio className="h-5 w-5 text-[#000000]" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-foreground truncate">
                            {uploadedAudio.name}
                          </p>
                          {videoDuration && (
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-2 h-2 bg-[#000000] rounded-full animate-pulse"></div>
                              <span className="text-sm text-foreground font-medium">
                                Duration: {videoDuration} seconds
                              </span>
                            </div>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedAudio(null);
                            setAudioUrl("");
                            setVideoDuration("");
                          }} 
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-colors rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="mx-auto w-16 h-16 bg-[#F2F2F2] rounded-full flex items-center justify-center shadow-sm">
                        {isProcessingAudio ? (
                          <div className="w-6 h-6 border-2 border-[#000000] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Upload className="h-6 w-6 text-[#000000]" />
                        )}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground mb-1">
                          {isProcessingAudio ? "Processing Audio..." : "Drop your audio file here"}
                        </p>
                        <p className="text-sm text-[#6E6E6E]">
                          Or click to browse • MP3, WAV, M4A supported
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleAudioUpload(file);
                }} />
                </div>
              </div>

              {/* Background Music */}
              <div className="space-y-6 p-6 bg-muted rounded-xl border border-[#E0E0E0]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#E0E0E0] rounded-lg shadow-sm">
                    <Music className="h-4 w-4 text-[#000000]" />
                  </div>
                  <div>
                    <Label className="text-lg font-semibold text-[#000000]">
                      Background Music
                    </Label>
                    <p className="text-sm text-[#6E6E6E] mt-1">
                      Optional: Add background music to enhance your video
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <Input 
                    placeholder="https://example.com/background-music.mp3" 
                    value={musicLink} 
                    onChange={e => setMusicLink(e.target.value)} 
                    className="bg-card border-[#E0E0E0] focus:border-[#000000] transition-colors pl-4 pr-12" 
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {musicLink.trim() ? (
                      <CheckCircle2 className="h-5 w-5 text-[#000000]" />
                    ) : (
                      <Music className="h-5 w-5 text-[#6E6E6E]" />
                    )}
                  </div>
                </div>
              </div>

              {/* Subtitles Toggle */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-[#E0E0E0]">
                <div>
                  <Label className="text-base font-medium">Subtitles</Label>
                  <p className="text-sm text-muted-foreground">Auto-generate subtitles from audio</p>
                </div>
                <Switch checked={subtitleStyleSelected} onCheckedChange={setSubtitleStyleSelected} />
              </div>
              
              {/* Generate Button */}
              <Button 
                onClick={generateAndRenderVideo} 
                disabled={isGenerating || !uploadedAudio || (!contentLinks.trim() && !selectedPerson) || !hasApiKey} 
                className="w-full h-16 text-base font-semibold bg-black hover:bg-black/90 text-white rounded-xl shadow-sm disabled:opacity-50" 
                size="lg"
              >
                {isGenerating ? (
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span>Generating Video...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-white/20 rounded-lg">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <span>Generate Video</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <StyleManagement 
        isOpen={styleManagementOpen} 
        onClose={() => setStyleManagementOpen(false)} 
        onStyleUpdated={fetchPersons}
      />
    </div>;
};
export default Index;
