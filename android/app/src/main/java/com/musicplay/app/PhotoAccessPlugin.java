package com.musicplay.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.OpenableColumns;
import androidx.activity.result.ActivityResult;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(name = "PhotoAccess", permissions = {
    @Permission(alias = "legacyPhotos", strings = { Manifest.permission.READ_EXTERNAL_STORAGE }),
    @Permission(alias = "photos", strings = { Manifest.permission.READ_MEDIA_IMAGES }),
    @Permission(alias = "selectedPhotos", strings = { Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED })
})
public class PhotoAccessPlugin extends Plugin {
    private boolean granted(String permission) {
        return ContextCompat.checkSelfPermission(getContext(), permission) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean hasPhotoAccess() {
        if (Build.VERSION.SDK_INT >= 34 && granted(Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED)) return true;
        return granted(Build.VERSION.SDK_INT >= 33 ? Manifest.permission.READ_MEDIA_IMAGES : Manifest.permission.READ_EXTERNAL_STORAGE);
    }

    @PluginMethod
    public void pickPhoto(PluginCall call) {
        if (hasPhotoAccess()) { openPicker(call); return; }
        String[] aliases = Build.VERSION.SDK_INT >= 34 ? new String[] { "photos", "selectedPhotos" }
            : new String[] { Build.VERSION.SDK_INT >= 33 ? "photos" : "legacyPhotos" };
        requestPermissionForAliases(aliases, call, "photosPermissionResult");
    }

    @PermissionCallback
    private void photosPermissionResult(PluginCall call) {
        if (hasPhotoAccess()) openPicker(call);
        else call.reject("No se permitió el acceso a las fotos. Activa el permiso en Ajustes > Aplicaciones > MusicPlay > Permisos.", "PHOTO_PERMISSION_DENIED");
    }

    private void openPicker(PluginCall call) {
        try {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.setType("image/*");
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivityForResult(call, intent, "photoSelected");
        } catch (Exception error) { call.reject("No se pudo abrir el selector de fotos.", null, error); }
    }

    @ActivityCallback
    private void photoSelected(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject data = new JSObject();
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            data.put("cancelled", true); call.resolve(data); return;
        }
        try {
            Uri uri = result.getData().getData();
            String name = "foto";
            try (Cursor cursor = getContext().getContentResolver().query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int column = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (column >= 0) name = cursor.getString(column);
                }
            }
            data.put("uri", uri.toString());
            data.put("name", name);
            data.put("mimeType", getContext().getContentResolver().getType(uri));
            data.put("cancelled", false);
            call.resolve(data);
        } catch (Exception error) { call.reject("No se pudo acceder a la foto seleccionada.", null, error); }
    }
}
