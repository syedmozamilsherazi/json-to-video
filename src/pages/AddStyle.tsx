import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileVideo, CheckCircle2, AlertCircle, Loader2, ArrowLeft, X } from 'lucide-react';
import { stylesSupabase as supabase } from '@/integrations/supabase/stylesClient';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { ensureBucket } from '@/lib/storage';

interface UploadedClip {
  id: string;
  name: string;
  file: File;
  duration: number;
  previewUrl: string;
  publicUrl?: string;
}

interface UploadState {
  status: 'idle' | 'uploading' | 'success' | 'error';
  message?: string;
}

export default function AddStyle() {
  const [styleName, setStyleName] = useState<string>('');
  const [uploadedClips, setUploadedClips] = useState<UploadedClip[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });
  const [isFinishing, setIsFinishing] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalDbValue, setOriginalDbValue] = useState<string>('');
  const [loadingExistingClips, setLoadingExistingClips] = useState(false);
  const [stylesBucket, setStylesBucket] = useState<string>((import.meta as any)?.env?.VITE_STYLES_BUCKET || 'clips');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const editData = location.state as { editMode?: boolean; styleName?: string; dbValue?: string } | null;
    if (editData?.editMode && editData.styleName && editData.dbValue) {
      setIsEditMode(true);
      setStyleName(editData.styleName);
      setOriginalDbValue(editData.dbValue);
      loadExistingClips(editData.styleName);
    }
  }, [location.state]);

  const loadExistingClips = async (styleName: string) => {
    setLoadingExistingClips(true);
    try {
      let listRes = await supabase.storage
        .from(stylesBucket)
        .list(styleName, {
          limit: 100,
          offset: 0
        });

      if (listRes.error && /Bucket not found/i.test(listRes.error.message)) {
        const created = await ensureBucket(stylesBucket, true);
        if (created) {
          listRes = await supabase.storage
            .from(stylesBucket)
            .list(styleName, { limit: 100, offset: 0 });
        } else {
          setStylesBucket('audio-files');
          await ensureBucket('audio-files', true);
          listRes = await supabase.storage
            .from('audio-files')
            .list(styleName, { limit: 100, offset: 0 });
        }
      }

      const { data: files, error: filesError } = listRes;
      if (filesError) {
        console.error('Error loading existing clips:', filesError);
        return;
      }

      const existingClips: UploadedClip[] = [];
      
      for (const file of files || []) {
        if (file.name && file.metadata) {
          const { data } = supabase.storage
            .from(stylesBucket)
            .getPublicUrl(`${styleName}/${file.name}`);

          const { data: clipMeta } = await supabase
            .from('clips_meta')
            .select('duration')
            .eq('url', data.publicUrl)
            .single();

          existingClips.push({
            id: file.name,
            name: file.name,
            file: new File([], file.name),
            duration: clipMeta?.duration || 0,
            previewUrl: data.publicUrl,
            publicUrl: data.publicUrl
          });
        }
      }

      setUploadedClips(existingClips);
    } catch (error) {
      console.error('Error loading existing clips:', error);
      toast({
        title: "Error",
        description: "Failed to load existing clips",
        variant: "destructive",
      });
    } finally {
      setLoadingExistingClips(false);
    }
  };

  const calculateVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      
      video.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve(Math.floor(video.duration));
      });
      
      video.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video metadata'));
      });
      
      video.src = url;
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast({
        title: "Invalid file type",
        description: "Please select a video file",
        variant: "destructive",
      });
      return;
    }

    if (!styleName.trim()) {
      toast({
        title: "Style name required",
        description: "Please enter a style name before uploading videos",
        variant: "destructive",
      });
      return;
    }

    setUploadState({ status: 'uploading' });

    try {
      const duration = await calculateVideoDuration(file);
      const previewUrl = URL.createObjectURL(file);
      
      const clipId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newClip: UploadedClip = {
        id: clipId,
        name: file.name,
        file,
        duration,
        previewUrl
      };

      setUploadedClips(prev => [...prev, newClip]);
      setUploadState({ status: 'success', message: 'Video uploaded successfully!' });
      
      toast({
        title: "Video uploaded",
        description: `Duration: ${duration} seconds`,
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadState({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to process video' 
      });
      
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'Failed to process video',
        variant: "destructive",
      });
    }
  };

  const removeClip = async (clipId: string) => {
    const clip = uploadedClips.find(c => c.id === clipId);
    if (!clip) return;

    if (isEditMode && clip.publicUrl) {
      try {
        const filePath = `${styleName}/${clip.name}`;
        let delRes = await supabase.storage
          .from(stylesBucket)
          .remove([filePath]);
        if (delRes.error && /Bucket not found/i.test(delRes.error.message)) {
          const created = await ensureBucket(stylesBucket, true);
          if (created) {
            delRes = await supabase.storage
              .from(stylesBucket)
              .remove([filePath]);
          } else {
            setStylesBucket('audio-files');
            await ensureBucket('audio-files', true);
            delRes = await supabase.storage
              .from('audio-files')
              .remove([filePath]);
          }
        }
        if (delRes.error) throw delRes.error;

        await supabase
          .from('clips_meta')
          .delete()
          .eq('url', clip.publicUrl);

        toast({
          title: "Clip removed",
          description: `${clip.name} has been deleted`,
        });
      } catch (error) {
        console.error('Error removing clip:', error);
        toast({
          title: "Error",
          description: "Failed to remove clip",
          variant: "destructive",
        });
        return;
      }
    }

    setUploadedClips(prev => {
      const clipToRemove = prev.find(c => c.id === clipId);
      if (clipToRemove?.previewUrl && !clipToRemove.publicUrl) {
        URL.revokeObjectURL(clipToRemove.previewUrl);
      }
      return prev.filter(c => c.id !== clipId);
    });
  };

  const handleFinish = async () => {
    if (!styleName.trim()) {
      toast({
        title: "Style name required",
        description: "Please enter a style name",
        variant: "destructive",
      });
      return;
    }

    if (uploadedClips.length === 0) {
      toast({
        title: "No clips uploaded",
        description: "Please upload at least one video clip",
        variant: "destructive",
      });
      return;
    }

    setIsFinishing(true);

    try {
      let uniquePersonName: string;
      
      if (isEditMode) {
        uniquePersonName = originalDbValue;
      } else {
        const baseName = styleName.trim().split(' ').pop() || styleName.trim();
        
        const { data: existingPersons } = await supabase
          .from('clips_meta')
          .select('person')
          .like('person', `${baseName}%`);

        uniquePersonName = baseName;
        if (existingPersons && existingPersons.length > 0) {
          const existingNames = existingPersons.map(p => p.person);
          let counter = 1;
          
          while (existingNames.includes(uniquePersonName)) {
            uniquePersonName = `${baseName}${counter}`;
            counter++;
          }
        }
      }

      const clipData = [] as { person: string; url: string; duration: number }[];
      let newClipsCount = 0;
      
      for (let i = 0; i < uploadedClips.length; i++) {
        const clip = uploadedClips[i];
        
        if (clip.publicUrl) {
          clipData.push({
            person: uniquePersonName,
            url: clip.publicUrl,
            duration: clip.duration
          });
          continue;
        }

        const fileExtension = clip.file.name.split('.').pop() || 'mp4';
        const fileName = `${uniquePersonName}_${Date.now()}_${i + 1}.${fileExtension}`;
        const filePath = `${styleName.trim()}/${fileName}`;

        let uploadRes = await supabase.storage
          .from(stylesBucket)
          .upload(filePath, clip.file, {
            upsert: true,
          });

        if (uploadRes.error && /Bucket not found/i.test(uploadRes.error.message)) {
          const created = await ensureBucket(stylesBucket, true);
          if (created) {
            uploadRes = await supabase.storage
              .from(stylesBucket)
              .upload(filePath, clip.file, { upsert: true });
          } else {
            setStylesBucket('audio-files');
            await ensureBucket('audio-files', true);
            uploadRes = await supabase.storage
              .from('audio-files')
              .upload(filePath, clip.file, { upsert: true });
          }
        }

        if (uploadRes.error) {
          throw new Error(`Upload failed for ${clip.name}: ${uploadRes.error.message}`);
        }

        const { data } = supabase.storage
          .from(stylesBucket)
          .getPublicUrl(filePath);

        clipData.push({
          person: uniquePersonName,
          url: data.publicUrl,
          duration: clip.duration
        });
        
        newClipsCount++;
      }

      if (newClipsCount > 0) {
        const newClipsData = clipData.filter((_, index) => !uploadedClips[index]?.publicUrl);
        
        if (newClipsData.length > 0) {
          const { error: dbError } = await supabase
            .from('clips_meta')
            .insert(newClipsData);

          if (dbError) {
            throw new Error(`Database insert failed: ${dbError.message}`);
          }
        }
      }

      toast({
        title: isEditMode ? "Style updated successfully!" : "Style created successfully!",
        description: isEditMode 
          ? `Updated ${styleName} with ${newClipsCount} new clips`
          : `Added ${uploadedClips.length} clips for ${styleName}`,
      });

      navigate('/generate');
      
    } catch (error) {
      console.error('Finish error:', error);
      toast({
        title: "Failed to create style",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive",
      });
    } finally {
      setIsFinishing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        handleFileSelect({ target: { files: dataTransfer.files } } as any);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/generate')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-[#000000]">
            {isEditMode ? 'Edit Style' : 'Add New Style'}
          </h1>
        </div>

        <Card className="border border-[#E0E0E0] shadow-sm bg-card overflow-hidden rounded-2xl">
          <CardHeader>
            <CardTitle className="text-[#000000]">{isEditMode ? 'Edit Style' : 'Create a New Style'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#000000]">Style Name</Label>
              <Input 
                placeholder="e.g. Viral Finance Clips"
                value={styleName}
                onChange={(e) => setStyleName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#000000]">Upload Videos</Label>
              <div 
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="space-y-2">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Click to select video files</p>
                </div>
              </div>
              {uploadState.status !== 'idle' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  {uploadState.status === 'uploading' && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm">Processing video...</span>
                    </>
                  )}
                  {uploadState.status === 'success' && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">{uploadState.message}</span>
                    </div>
                  )}
                  {uploadState.status === 'error' && (
                    <>
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm text-destructive">{uploadState.message}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-medium text-[#000000]">Clips</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {uploadedClips.map((clip) => (
                  <div key={clip.id} className="border rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileVideo className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-[#000000] truncate max-w-[240px]" title={clip.name}>{clip.name}</p>
                        <p className="text-xs text-muted-foreground">{clip.duration}s</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeClip(clip.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleFinish} disabled={isFinishing || (!isEditMode && uploadedClips.length === 0)}>
                {isFinishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {isEditMode ? 'Saving...' : 'Creating...'}
                  </>
                ) : (
                  isEditMode ? 'Save Changes' : 'Create Style'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}