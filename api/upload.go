package api

import (
	"fmt"
	"io"
	"log"
	"os"
	"strconv"

	"image"
	_ "image/jpeg"
	_ "image/png"

	"github.com/chai2010/webp"
	"github.com/nfnt/resize"
	"github.com/sour-dough/rezept-backend/db"
)

func (api *API) uploadImage(r request) error {
	httpContentType := r.req.Header.Get("Content-Type")
	if httpContentType != "image/jpeg" && httpContentType != "image/png" && httpContentType != "image/webp" {
		return r.writeError("Image must be png/jpeg/webp", 400)
	}

	fmt.Println(r.req.ContentLength)

	if r.req.ContentLength > int64(api.config.MaxUploadSize) {
		return r.writeError("Image too large - max size: "+strconv.Itoa(int(api.config.MaxUploadSize)), 400)
	}

	defer r.req.Body.Close()

	imgData, format, err := image.Decode(r.req.Body)
	if err != nil {
		return err
	}

	if format != "jpeg" && format != "png" && format != "webp" {
		return r.writeError("Image must be png/jpeg/webp", 400)
	}

	img := db.Image{
		UserID: r.user.ID,
		Size:   uint(r.req.ContentLength),
	}

	err = api.db.PutImage(&img)
	if err != nil {
		log.Println(err)
		return r.writeError("Internal Server Error", 500)
	}

	err = api.copyImageAndThumbnail(imgData, img.ID)
	if err != nil {
		log.Println(err)
		err = api.db.DeleteImage(img.ID)
		if err != nil {
			log.Println(err)
		}
		return r.writeError("Internal Server Error", 500)
	}

	resp := api.newImage(&img)
	r.code = 201
	return r.writeJson(resp)
}

func getImageFormat(r io.Reader) (string, error) {
	_, format, err := image.DecodeConfig(r)
	if err != nil {
		return "", err
	}

	return format, nil
}

func (api *API) copyImageAndThumbnail(img image.Image, id uint) error {
	file, err := os.Create(api.GetImagePath(id))
	if err != nil {
		return err
	}
	defer file.Close()

	err = webp.Encode(file, img, nil)
	if err != nil {
		return err
	}

	thumbnail := resize.Thumbnail(api.config.MaxThumbnailSize, api.config.MaxThumbnailSize, img, resize.Lanczos3)
	thumbFile, err := os.Create(api.GetThumbnailPath(id))
	if err != nil {
		return err
	}
	defer thumbFile.Close()

	err = webp.Encode(thumbFile, thumbnail, nil)
	if err != nil {
		return err
	}

	return nil
}
