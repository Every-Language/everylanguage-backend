import { getPublicUserId } from './user-service.ts';

export interface ImageData {
  remotePath: string;
  targetType: string;
  targetId: string;
  setId?: string;
  createdBy?: string;
  fileSize?: number;
}

export interface ImageSetData {
  name: string;
  remotePath: string;
  createdBy?: string;
}

export class ImageService {
  constructor(private supabaseClient: any) {}

  /**
   * Create a new image set
   */
  async createImageSet(data: ImageSetData) {
    const { data: imageSet, error } = await this.supabaseClient
      .from('image_sets')
      .insert({
        name: data.name,
        remote_path: data.remotePath,
        created_by: data.createdBy,
      })
      .select()
      .single();

    if (error || !imageSet) {
      throw new Error(
        `Failed to create image set: ${error?.message ?? 'Unknown database error'}`
      );
    }

    return imageSet;
  }

  /**
   * Create a new image record
   */
  async createImage(data: ImageData) {
    const { data: image, error } = await this.supabaseClient
      .from('images')
      .insert({
        remote_path: data.remotePath,
        target_type: data.targetType,
        target_id: data.targetId,
        set_id: data.setId,
        created_by: data.createdBy,
      })
      .select()
      .single();

    if (error || !image) {
      throw new Error(
        `Failed to create image: ${error?.message ?? 'Unknown database error'}`
      );
    }

    return image;
  }

  /**
   * Get authenticated user from auth UID
   * @deprecated Use getPublicUserId from user-service.ts instead
   */
  async getAuthenticatedUser(authUid?: string) {
    return await getPublicUserId(this.supabaseClient, authUid);
  }

  /**
   * Get all images for a target
   */
  async getImagesForTarget(targetType: string, targetId: string) {
    const { data, error } = await this.supabaseClient
      .from('images')
      .select(
        `
        id,
        remote_path,
        target_type,
        target_id,
        set_id,
        created_at,
        updated_at,
        image_sets (
          id,
          name,
          remote_path
        )
      `
      )
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get images: ${error.message}`);
    }

    return data ?? [];
  }

  /**
   * Get all images in a set
   */
  async getImagesInSet(setId: string) {
    const { data, error } = await this.supabaseClient
      .from('images')
      .select(
        `
        id,
        remote_path,
        target_type,
        target_id,
        set_id,
        created_at,
        updated_at
      `
      )
      .eq('set_id', setId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get images in set: ${error.message}`);
    }

    return data ?? [];
  }

  /**
   * Get image set by ID
   */
  async getImageSet(setId: string) {
    const { data, error } = await this.supabaseClient
      .from('image_sets')
      .select('*')
      .eq('id', setId)
      .single();

    if (error) {
      throw new Error(`Failed to get image set: ${error.message}`);
    }

    return data;
  }

  /**
   * Soft delete an image
   */
  async deleteImage(imageId: string, authUid?: string) {
    // First verify ownership
    if (authUid) {
      const userId = await getPublicUserId(this.supabaseClient, authUid);
      if (userId) {
        const { data: image } = await this.supabaseClient
          .from('images')
          .select('created_by')
          .eq('id', imageId)
          .single();

        if (image?.created_by !== userId) {
          throw new Error('Not authorized to delete this image');
        }
      }
    }

    const { error } = await this.supabaseClient
      .from('images')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', imageId);

    if (error) {
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }

  /**
   * Update image set
   */
  async updateImageSet(
    setId: string,
    updates: { name?: string; remote_path?: string },
    authUid?: string
  ) {
    // First verify ownership
    if (authUid) {
      const userId = await getPublicUserId(this.supabaseClient, authUid);
      if (userId) {
        const { data: imageSet } = await this.supabaseClient
          .from('image_sets')
          .select('created_by')
          .eq('id', setId)
          .single();

        if (imageSet?.created_by !== userId) {
          throw new Error('Not authorized to update this image set');
        }
      }
    }

    const { data, error } = await this.supabaseClient
      .from('image_sets')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', setId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update image set: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete image set (and all its images)
   */
  async deleteImageSet(setId: string, authUid?: string) {
    // First verify ownership
    if (authUid) {
      const userId = await getPublicUserId(this.supabaseClient, authUid);
      if (userId) {
        const { data: imageSet } = await this.supabaseClient
          .from('image_sets')
          .select('created_by')
          .eq('id', setId)
          .single();

        if (imageSet?.created_by !== userId) {
          throw new Error('Not authorized to delete this image set');
        }
      }
    }

    // Soft delete all images in the set first
    const { error: imagesError } = await this.supabaseClient
      .from('images')
      .update({ deleted_at: new Date().toISOString() })
      .eq('set_id', setId);

    if (imagesError) {
      throw new Error(`Failed to delete images in set: ${imagesError.message}`);
    }

    // Then delete the set itself (hard delete for sets)
    const { error: setError } = await this.supabaseClient
      .from('image_sets')
      .delete()
      .eq('id', setId);

    if (setError) {
      throw new Error(`Failed to delete image set: ${setError.message}`);
    }
  }

  /**
   * Check if user owns image set
   */
  async userOwnsImageSet(setId: string, authUid: string): Promise<boolean> {
    const userId = await getPublicUserId(this.supabaseClient, authUid);
    if (!userId) return false;

    const { data } = await this.supabaseClient
      .from('image_sets')
      .select('created_by')
      .eq('id', setId)
      .single();

    return data?.created_by === userId;
  }

  /**
   * Check if user owns image
   */
  async userOwnsImage(imageId: string, authUid: string): Promise<boolean> {
    const userId = await getPublicUserId(this.supabaseClient, authUid);
    if (!userId) return false;

    const { data } = await this.supabaseClient
      .from('images')
      .select('created_by')
      .eq('id', imageId)
      .single();

    return data?.created_by === userId;
  }
}
