package storage

import (
	"context"
	"io"
	"log"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Storage struct {
	client *minio.Client
	bucket string
}

func NewMinioStorage(endpoint, accessKey, secretKey, bucketName string) (*Storage, error) {
	// Use false for useSSL in local docker environment
	useSSL := false

	// Initialize minio client object.
	minioClient, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, err
	}

	ctx := context.Background()

	// Cek apakah bucket sudah ada
	err = minioClient.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{Region: "us-east-1"})
	if err != nil {
		// Check to see if we already own this bucket (which happens if you run this twice)
		exists, errBucketExists := minioClient.BucketExists(ctx, bucketName)
		if errBucketExists == nil && exists {
			log.Printf("STORAGE: We already own bucket %s\n", bucketName)
		} else {
			return nil, err
		}
	} else {
		log.Printf("STORAGE: Successfully created %s bucket\n", bucketName)
	}

	log.Println("Connected to MinIO Storage Layer")

	return &Storage{
		client: minioClient,
		bucket: bucketName,
	}, nil
}

// UploadObject streams data to MinIO. Context is critical here to handle client cancellations.
func (s *Storage) UploadObject(ctx context.Context, objectName string, reader io.Reader, objectSize int64, contentType string) (minio.UploadInfo, error) {
	log.Printf("STORAGE: Uploading object %s (Size: %d, Type: %s)", objectName, objectSize, contentType)
	info, err := s.client.PutObject(ctx, s.bucket, objectName, reader, objectSize, minio.PutObjectOptions{
		ContentType: contentType,
	})
	return info, err
}

// DownloadObject retrieves an object stream from MinIO
func (s *Storage) DownloadObject(ctx context.Context, objectName string) (*minio.Object, error) {
	log.Printf("STORAGE: Downloading object %s", objectName)
	object, err := s.client.GetObject(ctx, s.bucket, objectName, minio.GetObjectOptions{})
	return object, err
}

// DeleteObject removes an object from MinIO
func (s *Storage) DeleteObject(ctx context.Context, objectName string) error {
	log.Printf("STORAGE: Deleting object %s", objectName)
	err := s.client.RemoveObject(ctx, s.bucket, objectName, minio.RemoveObjectOptions{})
	return err
}
