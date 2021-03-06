import Model from './Model';
import API from './API';

export default class Image extends Model {
  ID: number;

  URL: string;

  ThumbnailURL: string;

  static async uploadImage(
    file: File,
    onProgress: (uploaded: number, total: number) => void,
  ): Promise<Image> {
    const response = await API.getInstance().upload('PUT', 'image', file, onProgress);

    return response as Image;
  }
}
