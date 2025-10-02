import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit, Trash2, Loader2 } from 'lucide-react';
import { stylesSupabase as supabase } from '@/integrations/supabase/stylesClient';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface StyleData {
  displayName: string;
  dbValue: string;
  clipsCount: number;
}

interface StyleManagementProps {
  isOpen: boolean;
  onClose: () => void;
  onStyleUpdated: () => void;
}

export const StyleManagement = ({ isOpen, onClose, onStyleUpdated }: StyleManagementProps) => {
  const [styles, setStyles] = useState<StyleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [styleToDelete, setStyleToDelete] = useState<StyleData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      loadStyles();
    }
  }, [isOpen]);

  const loadStyles = async () => {
    setLoading(true);
    try {
      const { data: folders, error: foldersError } = await supabase.storage
        .from('clips')
        .list('', {
          limit: 100,
          offset: 0
        });

      if (foldersError) {
        console.error('Error fetching folders:', foldersError);
        return;
      }

      const styleFolders = folders?.filter(item => 
        item.name !== 'audio' && item.metadata === null
      ) || [];

      const stylesData: StyleData[] = [];
      
      for (const folder of styleFolders) {
        const displayName = folder.name;
        const { data: folderFiles, error: folderError } = await supabase.storage
          .from('clips')
          .list(folder.name, {
            limit: 100,
            offset: 0
          });

        if (folderError) {
          console.error('Error fetching folder files:', folderError);
          continue;
        }

        const videoFiles = folderFiles?.filter(file => 
          file.metadata && file.name.includes('.')
        ) || [];

        let dbValue = displayName.trim().split(' ').pop() || displayName;
        
        if (videoFiles.length > 0) {
          const { data } = supabase.storage
            .from('clips')
            .getPublicUrl(`${folder.name}/${videoFiles[0].name}`);

          const { data: clipData, error: clipError } = await supabase
            .from('clips_meta')
            .select('person')
            .eq('url', data.publicUrl)
            .limit(1);

          if (!clipError && clipData && clipData.length > 0) {
            dbValue = clipData[0].person;
          }
        }

        stylesData.push({
          displayName,
          dbValue,
          clipsCount: videoFiles.length
        });
      }

      setStyles(stylesData);
    } catch (error) {
      console.error('Error loading styles:', error);
      toast({
        title: "Error",
        description: "Failed to load styles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (style: StyleData) => {
    navigate('/add-style', { 
      state: { 
        editMode: true, 
        styleName: style.displayName,
        dbValue: style.dbValue
      } 
    });
    onClose();
  };

  const handleDeleteClick = (style: StyleData) => {
    setStyleToDelete(style);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!styleToDelete) return;
    
    setDeleting(true);
    try {
      const { data: files, error: listError } = await supabase.storage
        .from('clips')
        .list(styleToDelete.displayName, {
          limit: 100,
          offset: 0
        });

      if (listError) {
        throw new Error(`Failed to list files: ${listError.message}`);
      }

      if (files && files.length > 0) {
        const filePaths = files.map(file => `${styleToDelete.displayName}/${file.name}`);
        const { error: deleteFilesError } = await supabase.storage
          .from('clips')
          .remove(filePaths);

        if (deleteFilesError) {
          throw new Error(`Failed to delete files: ${deleteFilesError.message}`);
        }
      }

      const { error: dbError } = await supabase
        .from('clips_meta')
        .delete()
        .eq('person', styleToDelete.dbValue);

      if (dbError) {
        throw new Error(`Failed to delete from database: ${dbError.message}`);
      }

      toast({
        title: "Style deleted",
        description: `${styleToDelete.displayName} has been removed`,
      });

      await loadStyles();
      onStyleUpdated();
      
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : 'Failed to delete style',
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setStyleToDelete(null);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-[#000000]">Manage Styles</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-96 pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#000000]" />
                <span className="ml-2 text-[#000000]">Loading styles...</span>
              </div>
            ) : styles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No styles found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {styles.map((style) => (
                  <div 
                    key={style.dbValue} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-[#000000]">{style.displayName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {style.clipsCount} clip{style.clipsCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(style)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(style)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#000000]">Delete Style</AlertDialogTitle>
            <AlertDialogDescription>
              Do you really want to delete "{styleToDelete?.displayName}"? This action cannot be undone.
              All video clips and data associated with this style will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Style'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};