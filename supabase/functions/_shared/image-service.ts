// Image service for database operations

export interface ImageData {
  remotePath: string;
  targetType: string;
  targetId: string;
  setId?: string;
  createdBy?: string;
  fileSize: number;
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
   */
  async getAuthenticatedUser(authUid?: string) {
    if (!authUid) return null;

    const { data } = await this.supabaseClient
      .from('users')
      .select('id')
      .eq('auth_uid', authUid)
      .single();

    return data;
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
   * Get images by set ID
   */
  async getImagesBySet(setId: string) {
    const { data, error } = await this.supabaseClient
      .from('images')
      .select('*')
      .eq('set_id', setId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get images by set: ${error.message}`);
    }

    return data;
  }

  /**
   * Get images by target
   */
  async getImagesByTarget(targetType: string, targetId: string) {
    const { data, error } = await this.supabaseClient
      .from('images')
      .select('*')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get images by target: ${error.message}`);
    }

    return data;
  }

  /**
   * Soft delete an image
   */
  async deleteImage(imageId: string, authUid?: string) {
    // First verify ownership
    if (authUid) {
      const user = await this.getAuthenticatedUser(authUid);
      if (user) {
        const { data: image } = await this.supabaseClient
          .from('images')
          .select('created_by')
          .eq('id', imageId)
          .single();

        if (image?.created_by !== user.id) {
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
      const user = await this.getAuthenticatedUser(authUid);
      if (user) {
        const { data: imageSet } = await this.supabaseClient
          .from('image_sets')
          .select('created_by')
          .eq('id', setId)
          .single();

        if (imageSet?.created_by !== user.id) {
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
   * Get image by ID
   */
  async getImage(imageId: string) {
    const { data, error } = await this.supabaseClient
      .from('images')
      .select('*')
      .eq('id', imageId)
      .is('deleted_at', null)
      .single();

    if (error) {
      throw new Error(`Failed to get image: ${error.message}`);
    }

    return data;
  }

  /**
   * Check if user owns image set
   */
  async userOwnsImageSet(setId: string, authUid: string): Promise<boolean> {
    const user = await this.getAuthenticatedUser(authUid);
    if (!user) return false;

    const { data } = await this.supabaseClient
      .from('image_sets')
      .select('created_by')
      .eq('id', setId)
      .single();

    return data?.created_by === user.id;
  }

  /**
   * Check if user owns image
   */
  async userOwnsImage(imageId: string, authUid: string): Promise<boolean> {
    const user = await this.getAuthenticatedUser(authUid);
    if (!user) return false;

    const { data } = await this.supabaseClient
      .from('images')
      .select('created_by')
      .eq('id', imageId)
      .single();

    return data?.created_by === user.id;
  }
}
